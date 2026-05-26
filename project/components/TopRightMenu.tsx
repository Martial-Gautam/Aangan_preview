import Link from 'next/link';
import { MoreVertical, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopRightMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2A4365]/20">
        <MoreVertical className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-xl dark:bg-[#1C1C1C]/95 border-black/5 dark:border-white/10 rounded-xl shadow-xl mt-2 p-1.5 z-[100]">
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-[#2A4365]/5 dark:focus:bg-white/10 data-[highlighted]:text-[#2A4365] dark:data-[highlighted]:text-white data-[highlighted]:bg-[#2A4365]/5 dark:data-[highlighted]:bg-white/10">
          <Link href="/profile" className="flex items-center w-full min-h-[44px] px-3 gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A4365]/10 text-[#2A4365] dark:bg-white/10 dark:text-gray-200">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] text-gray-900 dark:text-gray-100">Profile & Settings</span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
