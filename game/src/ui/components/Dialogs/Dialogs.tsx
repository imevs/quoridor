import { MenuDialog } from './MenuDialog';
import { RulesDialog } from './RulesDialog';
import { WinDialog } from './WinDialog';
import { HistoryDialog } from './HistoryDialog';
import { MovesDialog } from './MovesDialog';
import { LobbyDialog } from './LobbyDialog';
import { InviteDialog } from './InviteDialog';
import { UndoDialog } from './UndoDialog';
import { JoinDialog } from './JoinDialog';

export {
  Modal,
  type ModalProps,
  DialogCloseButton,
  type DialogCloseButtonProps,
  DialogHeader,
  type DialogHeaderProps,
} from './Modal';
export { MenuDialog } from './MenuDialog';
export { RulesDialog } from './RulesDialog';
export { WinDialog } from './WinDialog';
export { HistoryDialog } from './HistoryDialog';
export { MovesDialog } from './MovesDialog';
export { LobbyDialog } from './LobbyDialog';
export { InviteDialog } from './InviteDialog';
export { UndoDialog } from './UndoDialog';
export { JoinDialog } from './JoinDialog';

export function Dialogs() {
  return (
    <>
      <MenuDialog />
      <RulesDialog />
      <WinDialog />
      <HistoryDialog />
      <MovesDialog />
      <LobbyDialog />
      <InviteDialog />
      <UndoDialog />
      <JoinDialog />
    </>
  );
}
