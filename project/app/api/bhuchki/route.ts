import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StreamChat } from 'stream-chat';
import { streamText, tool as createTool } from 'ai';

const systemPrompt = `You are Bhuchki, the AI assistant inside Aangan (formerly Familiar).
Identity:
* Your name is Bhuchki.
* You are warm, natural, intelligent, and helpful.
* You feel like a family companion, not a robotic assistant.
* Keep responses concise and conversational.
* Avoid sounding overly formal or technical.
* If an action succeeds, confirm naturally.
* If information is missing, ask follow-up questions.

Primary responsibilities:
1. Help users navigate Aangan.
2. Help users manage family relationships.
3. Help users create and find memories.
4. Help users manage messages and events.
5. Help users search and understand family connections.

Behavior rules:
* Never invent family relationships.
* Never assume missing information.
* Ask clarification questions when needed.
* Use tools when an action is requested.
* Do not claim actions happened if no tool was executed.
* Explain failures clearly.
* Remember ongoing conversation context.
`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Set up tools specific to the auth'd user
  const tools = {
    getFamilyContext: createTool({
      description: 'Get the immediate family context (relatives) for the current user to understand who is who in their family network.',
      parameters: z.object({
        dummy: z.string().optional()
      }),
      execute: async ({ dummy }: { dummy?: string }) => {
        // Find owner ID
        const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('id', user.id).single();
        if (!profile) return JSON.stringify({ error: 'No profile found' });
        
        const { data: people } = await supabase.from('people').select('*').eq('owner_id', user.id);
        const { data: rels } = await supabase.from('relationships').select('*, person:people!relationships_person_id_fkey(full_name), related:people!relationships_related_person_id_fkey(full_name)').eq('owner_id', user.id);
        
        return JSON.stringify({
          user: profile.full_name,
          people_count: people?.length || 0,
          relationships: rels?.map(r => `${r.person?.full_name} -> ${r.relationship_type} -> ${r.related?.full_name}`) || []
        });
      }
    }),
    sendMessage: createTool({
      description: 'Send a message to a relative. If the recipient is ambiguous, ask the user to clarify.',
      parameters: z.object({
        recipientMatch: z.string().describe('The name or relationship of the person to send the message to.'),
        message: z.string().describe('The message content')
      }),
      execute: async ({ recipientMatch, message }) => {
        try {
          const { data: people } = await supabase.from('people').select('id, full_name, user_id').eq('owner_id', user.id).ilike('full_name', `%${recipientMatch}%`);
          const matchedPerson = people?.find(p => p.full_name.toLowerCase().includes(recipientMatch.toLowerCase()));
          
          if (!matchedPerson) return `Could not find a relative matching "${recipientMatch}".`;
          if (!matchedPerson.user_id) return `${matchedPerson.full_name} does not have a connected Aangan account yet.`;
          
          const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
          const streamApiSecret = process.env.STREAM_API_SECRET;
          
          if (!streamApiKey || !streamApiSecret) {
            console.error('Missing Stream credentials');
            return 'Could not send message. Stream chat not configured.';
          }
          
          const streamClient = new StreamChat(streamApiKey, streamApiSecret);
          const channel = streamClient.channel('messaging', {
            members: [user.id, matchedPerson.user_id]
          });
          await channel.create();
          await channel.sendMessage({ text: message, user_id: user.id } as any);
          
          return `Sent message successfully to ${matchedPerson.full_name}.`;
        } catch (e) {
          return 'Failed to send message: ' + (e as Error).message;
        }
      }
    }),
    createMemory: createTool({
      description: 'Create a new memory post for the user',
      parameters: z.object({
        title: z.string(),
        description: z.string()
      }),
      execute: async ({ title, description }) => {
        const { error } = await supabase.from('posts').insert({
          author_id: user.id,
          type: 'post',
          category: 'memories',
          title,
          content: description,
          audience_side: ['All'],
          audience_degree: ['All']
        });
        if (error) return `Failed to create memory: ${error.message}`;
        return 'Memory created successfully';
      }
    }),
    createEvent: createTool({
      description: 'Create an event (using a post of category "general" but treated as an event)',
      parameters: z.object({
        title: z.string(),
        date: z.string().describe('Event date or time description'),
      }),
      execute: async ({ title, date }) => {
        const { error } = await supabase.from('posts').insert({
          author_id: user.id,
          type: 'post',
          category: 'general',
          title,
          content: `🗓️ **Event:** ${date}\n\n${title}`,
          audience_side: ['All'],
          audience_degree: ['All']
        });
        if (error) return `Failed to create event: ${error.message}`;
        return 'Event created successfully';
      }
    }),
    addFamilyMember: createTool({
      description: 'Add a new family member to the tree',
      parameters: z.object({
        name: z.string(),
      }),
      execute: async ({ name }) => {
        const { error } = await supabase.from('people').insert({
          owner_id: user.id,
          full_name: name,
        });
        if (error) return `Failed to add family member: ${error.message}`;
        return `Added ${name} to the family successfully.`;
      }
    })
  };

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}