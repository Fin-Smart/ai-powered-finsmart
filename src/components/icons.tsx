import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
import AppleIcon from '@hugeicons/core-free-icons/AppleIcon';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import GoogleIcon from '@hugeicons/core-free-icons/GoogleIcon';
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import LockPasswordIcon from '@hugeicons/core-free-icons/LockPasswordIcon';
import MailSend01Icon from '@hugeicons/core-free-icons/MailSend01Icon';
import ViewIcon from '@hugeicons/core-free-icons/ViewIcon';
import ViewOffSlashIcon from '@hugeicons/core-free-icons/ViewOffSlashIcon';
import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import Home11Icon from '@hugeicons/core-free-icons/Home11Icon';
import Mail01Icon from '@hugeicons/core-free-icons/Mail01Icon';
import Message01Icon from '@hugeicons/core-free-icons/Message01Icon';
import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import Refresh01Icon from '@hugeicons/core-free-icons/Refresh01Icon';
import SendIcon from '@hugeicons/core-free-icons/SendIcon';
import Shield01Icon from '@hugeicons/core-free-icons/Shield01Icon';
import HugeStopIcon from '@hugeicons/core-free-icons/StopIcon';
import UserIcon from '@hugeicons/core-free-icons/UserIcon';
import WorkHistoryIcon from '@hugeicons/core-free-icons/WorkHistoryIcon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import Logout01Icon from '@hugeicons/core-free-icons/Logout01Icon';
import MailValidation01Icon from '@hugeicons/core-free-icons/MailValidation01Icon';
import Money03Icon from '@hugeicons/core-free-icons/Money03Icon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
import Wallet01Icon from '@hugeicons/core-free-icons/Wallet01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import Airplane01Icon from '@hugeicons/core-free-icons/Airplane01Icon';
import Briefcase01Icon from '@hugeicons/core-free-icons/Briefcase01Icon';
import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
import PiggyBankIcon from '@hugeicons/core-free-icons/PiggyBankIcon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import Notification01Icon from '@hugeicons/core-free-icons/Notification01Icon';
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
export const ShieldIcon = createIcon(Shield01Icon);
export const CoachIcon = createIcon(BubbleChatIcon);
export const ProfileIcon = createIcon(UserIcon);
export const PaperPlaneIcon = createIcon(SendIcon);
export const MicIcon = createIcon(Mic01Icon);
export const StopIcon = createIcon(HugeStopIcon);
export const ComposeIcon = createIcon(PencilEdit02Icon);
export const RefreshIcon = createIcon(Refresh01Icon);
export const HistoryIcon = createIcon(WorkHistoryIcon);
export const MessageIcon = createIcon(Message01Icon);
export const MailIcon = createIcon(Mail01Icon);
export const AlertIcon = createIcon(Alert02Icon);
export const CheckIcon = createIcon(CheckmarkCircle02Icon);
export const InfoIcon = createIcon(InformationCircleIcon);
export const BackIcon = createIcon(ArrowLeft01Icon);
export const GoogleLogoIcon = createIcon(GoogleIcon);
export const AppleLogoIcon = createIcon(AppleIcon);
export const LockIcon = createIcon(LockPasswordIcon);
export const MailSentIcon = createIcon(MailSend01Icon);
export const EyeIcon = createIcon(ViewIcon);
export const EyeOffIcon = createIcon(ViewOffSlashIcon);
export const ChevronRightIcon = createIcon(ArrowRight01Icon);
export const DeleteIcon = createIcon(Delete02Icon);
export const LogoutIcon = createIcon(Logout01Icon);
export const MailVerifyIcon = createIcon(MailValidation01Icon);
export const CurrencyIcon = createIcon(Money03Icon);
export const AppearanceIcon = createIcon(Moon02Icon);
export const PlusIcon = createIcon(PlusSignIcon);
export const WalletIcon = createIcon(Wallet01Icon);
export const TickIcon = createIcon(Tick02Icon);
export const TravelIcon = createIcon(Airplane01Icon);
export const BusinessIcon = createIcon(Briefcase01Icon);
export const EventIcon = createIcon(Calendar03Icon);
export const SavingsIcon = createIcon(PiggyBankIcon);
export const SparkleIcon = createIcon(SparklesIcon);
export const BellIcon = createIcon(Notification01Icon);
