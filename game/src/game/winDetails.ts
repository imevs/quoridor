export interface WinDetailsParams {
  mode: 'ai' | 'local' | 'online' | 'bot_vs_bot' | 'p2p';
  winnerAnimalName: string;
  isHuman: boolean;
  isLocal: boolean;
  timedOutAnimalName?: string;
}

/**
 * Formats game-end dialogue title and descriptive status message based on
 * match mode, player perspective, and victory condition (goal line reached vs timeout forfeit).
 */
export function formatWinDetails(params: WinDetailsParams): { title: string; sub: string } {
  const { mode, winnerAnimalName, isHuman, isLocal, timedOutAnimalName } = params;
  let title = `${winnerAnimalName} wins`;
  let sub = timedOutAnimalName
    ? `Won on time (${timedOutAnimalName} ran out of time).`
    : 'Goal line reached.';

  if (mode === 'ai') {
    title = isHuman ? 'You win' : `${winnerAnimalName} wins`;
    if (!timedOutAnimalName) {
      sub = isHuman ? 'Goal line reached.' : 'Opponent reached the goal line.';
    }
  } else if (mode === 'bot_vs_bot') {
    title = `${winnerAnimalName} wins!`;
    if (!timedOutAnimalName) {
      sub = `Bot ${winnerAnimalName} reached the goal line.`;
    }
  } else if (mode === 'online' || mode === 'p2p') {
    title = isLocal ? 'Victory!' : `${winnerAnimalName} wins`;
  }

  return { title, sub };
}
