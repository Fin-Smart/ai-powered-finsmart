import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon';
import Home11Icon from '@hugeicons/core-free-icons/Home11Icon';
import LeftToRightListBulletIcon from '@hugeicons/core-free-icons/LeftToRightListBulletIcon';
import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import Refresh01Icon from '@hugeicons/core-free-icons/Refresh01Icon';
import SendIcon from '@hugeicons/core-free-icons/SendIcon';
import HugeStopIcon from '@hugeicons/core-free-icons/StopIcon';
import UserIcon from '@hugeicons/core-free-icons/UserIcon';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';

export type IconProps = {
  color: string;
  size?: number;
  /** Selected state: free Hugeicons are outline-only, so it's shown with a bolder stroke. */
  active?: boolean;
  strokeWidth?: number;
};

const STROKE = 1.8;
const ACTIVE_STROKE = 2.4;

function createIcon(icon: IconSvgElement) {
  return function Icon({ color, size = 24, active, strokeWidth }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth ?? (active ? ACTIVE_STROKE : STROKE)}
      />
    );
  };
}

export const HomeIcon = createIcon(Home11Icon);
export const ReportsIcon = createIcon(LeftToRightListBulletIcon);
export const CoachIcon = createIcon(BubbleChatIcon);
export const ProfileIcon = createIcon(UserIcon);
export const PaperPlaneIcon = createIcon(SendIcon);
export const MicIcon = createIcon(Mic01Icon);
export const StopIcon = createIcon(HugeStopIcon);
export const ComposeIcon = createIcon(PencilEdit02Icon);
export const RefreshIcon = createIcon(Refresh01Icon);
