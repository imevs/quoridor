import { Loader } from './Loader/Loader';
import { TopBar } from './TopBar/TopBar';
import { PlayerCards } from './PlayerCards/PlayerCards';
import { Notifications } from './Notifications/Notifications';
import { ReplayBar } from './ReplayBar/ReplayBar';
import { Dialogs } from './Dialogs/Dialogs';

export function HudApp() {
  return (
    <>
      <Loader />
      <TopBar />
      <PlayerCards />
      <Notifications />
      <ReplayBar />
      <Dialogs />
    </>
  );
}
