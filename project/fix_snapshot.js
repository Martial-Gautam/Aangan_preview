const fs = require('fs');
const path = './components/welcome/DeferredLandingSections.tsx';
let content = fs.readFileSync(path, 'utf8');

const snapshotJSX = `
    <div className="rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(22,49,77,0.98),rgba(8,21,34,0.98))] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/8">
        <div>
          <h3 className="text-white text-xl font-bold mt-1">{activeFeature.title}</h3>
        </div>
        <div className={\`w-12 h-12 rounded-2xl bg-gradient-to-br \${activeFeature.gradient} flex items-center justify-center\`}>
          <activeFeature.icon size={22} className="text-white" />
        </div>
      </div>

      <div className="p-5">
        <div className="relative h-72 rounded-3xl bg-white/[0.055] border border-white/10 overflow-hidden">
          <svg viewBox="0 0 390 290" className="absolute inset-0 h-full w-full">
            {activeFeature.snapshot === 'tree' && (
              <g>
                <path d="M195 138 L112 78 L62 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                <path d="M195 138 L278 78 L328 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                <path d="M195 138 L144 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                <path d="M195 138 L246 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                {[[195, 138, 'ME'], [112, 78, 'Maa'], [278, 78, 'Papa'], [62, 48, 'Nani'], [328, 48, 'Dada'], [144, 220, 'Bhai'], [246, 220, 'Bua']].map(([cx, cy, label]) => (
                  <g key={label as string}>
                    <circle cx={cx as number} cy={cy as number} r="24" fill="#fff7df" />
                    <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                  </g>
                ))}
              </g>
            )}
            {activeFeature.snapshot === 'privacy' && (
              <g>
                <rect x="58" y="54" width="274" height="44" rx="16" fill="#ffffff" fillOpacity="0.92" />
                <text x="82" y="81" fontSize="12" fontWeight="900" fill="#17324f">Share with: Family up to 2nd degree</text>
                {[76, 138, 200, 262, 324].map((cx, index) => (
                  <g key={cx}>
                    <circle cx={cx} cy="172" r={index < 3 ? 28 : 20} fill={index < 3 ? '#bff3d5' : '#ffffff'} fillOpacity={index < 3 ? 1 : 0.28} />
                    <text x={cx} y="177" textAnchor="middle" fontSize="10" fontWeight="900" fill={index < 3 ? '#17324f' : '#ffffff'}>{index + 1}</text>
                  </g>
                ))}
                <path d="M76 172 L324 172" stroke="#ffd98f" strokeWidth="2" strokeDasharray="5 6" />
              </g>
            )}
            {activeFeature.snapshot === 'nearby' && (
              <g>
                <path d="M60 225 C120 130 180 240 238 132 C280 58 330 104 342 62" stroke="#70e4c1" strokeWidth="3" fill="none" />
                {[[108, 155, 'Maasi'], [206, 204, 'Mama'], [282, 94, 'Bua']].map(([cx, cy, label]) => (
                  <g key={label as string}>
                    <circle cx={cx as number} cy={cy as number} r="25" fill="#b7e5ff" />
                    <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                  </g>
                ))}
                <circle cx="195" cy="145" r="44" fill="#ffba78" fillOpacity="0.18" stroke="#ffba78" strokeWidth="2" />
                <text x="195" y="148" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">You</text>
              </g>
            )}
            {activeFeature.snapshot === 'invite' && (
              <g>
                <rect x="52" y="48" width="286" height="168" rx="24" fill="#fff7df" />
                <text x="88" y="88" fontSize="18" fontWeight="900" fill="#17324f">Wedding Invite</text>
                <text x="88" y="114" fontSize="11" fontWeight="700" fill="#49627d">Send to paternal + maternal family</text>
                <rect x="88" y="145" width="88" height="26" rx="13" fill="#17324f" />
                <text x="132" y="162" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">42 sent</text>
                <path d="M236 112 L300 78 L288 152 Z" fill="#ff7f63" />
              </g>
            )}
            {activeFeature.snapshot === 'media' && (
              <g>
                {[52, 134, 216].map((x, index) => (
                  <g key={x}>
                    <rect x={x} y={64 + index * 22} width="116" height="88" rx="18" fill={['#ffd98f', '#b7e5ff', '#bff3d5'][index]} />
                    <circle cx={x + 30} cy={94 + index * 22} r="13" fill="#17324f" fillOpacity="0.28" />
                    <path d={\`M\${x + 16} \${130 + index * 22}L\${x + 55} \${104 + index * 22}L\${x + 100} \${135 + index * 22}\`} stroke="#17324f" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.38" />
                  </g>
                ))}
              </g>
            )}
            {activeFeature.snapshot === 'ancestor' && (
              <g>
                {[44, 94, 144, 194, 244].map((y, index) => (
                  <g key={y}>
                    <line x1="195" y1={y + 30} x2="195" y2={y + 50} stroke="#ffd98f" strokeWidth="2.4" />
                    <rect x={100 + index * 12} y={y} width={190 - index * 24} height="34" rx="17" fill="#ffffff" fillOpacity={0.95 - index * 0.1} />
                    <text x="195" y={y + 22} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17324f">{index === 0 ? 'You' : \`\${index + 1} generations back\`}</text>
                  </g>
                ))}
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>`;

const target = `function FeatureSnapshot({ activeFeature }: { activeFeature: any }) {
  return (
    <FeatureSnapshot activeFeature={activeFeature} />
  );
}`;

content = content.replace(target, `function FeatureSnapshot({ activeFeature }: { activeFeature: any }) {\n  return (\n${snapshotJSX}\n  );\n}`);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed infinite recursion!');
