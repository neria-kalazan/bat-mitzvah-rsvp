import React from 'react';
import { Leaf, Eye, Image as ImageIcon } from 'lucide-react';
import { EventDetails } from '../types';

interface HeaderProps {
  event: EventDetails;
  onOpenInvitationImage?: () => void;
  onOpenGallery?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  event,
  onOpenInvitationImage,
  onOpenGallery,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E3ECE1] transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EBF1E9] border border-[#CCD8CA] flex items-center justify-center text-[#4A5D47] shadow-xs">
            <Leaf className="w-4 h-4 fill-[#4A5D47]/20" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#2D382B] flex items-center gap-1.5 font-['Rubik',sans-serif]">
              בת המצווה של {event.celebrantName}
            </span>
            <div className="text-[11px] text-[#5E735B] font-medium">אישור הגעה דיגיטלי · משפחת קלזן</div>
          </div>
        </div>

        {/* Action icons / buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gallery Button */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              title="צפייה בגלריית המזכרות"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#32452F] bg-[#EEF5EC] hover:bg-[#DFEDE0] transition-colors border border-[#CCDCCD] cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#425B3E]" />
              <span className="hidden sm:inline">גלריית מזכרות</span>
            </button>
          )}

          {/* View Original Invitation */}
          {onOpenInvitationImage && (
            <button
              onClick={onOpenInvitationImage}
              title="צפייה בהזמנה המקורית"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#3E4E3C] bg-white hover:bg-[#F0F5EE] transition-colors border border-[#D5E1D3] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#546851]" />
              <span className="hidden sm:inline">ההזמנה המקורית</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

