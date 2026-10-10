import { describe, expect, it } from 'vitest';
import { formatWinDetails } from '../winDetails';

describe('formatWinDetails', () => {
  it('formats AI mode victory for human player on goal line', () => {
    const res = formatWinDetails({
      mode: 'ai',
      winnerAnimalName: 'Fox',
      isHuman: true,
      isLocal: true,
    });
    expect(res.title).toBe('You win');
    expect(res.sub).toBe('Goal line reached.');
  });

  it('formats AI mode victory for AI opponent on goal line', () => {
    const res = formatWinDetails({
      mode: 'ai',
      winnerAnimalName: 'Wolf',
      isHuman: false,
      isLocal: false,
    });
    expect(res.title).toBe('Wolf wins');
    expect(res.sub).toBe('Opponent reached the goal line.');
  });

  it('formats AI mode victory on opponent timeout', () => {
    const res = formatWinDetails({
      mode: 'ai',
      winnerAnimalName: 'Fox',
      isHuman: true,
      isLocal: true,
      timedOutAnimalName: 'Wolf',
    });
    expect(res.title).toBe('You win');
    expect(res.sub).toBe('Won on time (Wolf ran out of time).');
  });

  it('formats bot vs bot victory', () => {
    const res = formatWinDetails({
      mode: 'bot_vs_bot',
      winnerAnimalName: 'Bear',
      isHuman: false,
      isLocal: false,
    });
    expect(res.title).toBe('Bear wins!');
    expect(res.sub).toBe('Bot Bear reached the goal line.');
  });

  it('formats bot vs bot victory on timeout', () => {
    const res = formatWinDetails({
      mode: 'bot_vs_bot',
      winnerAnimalName: 'Bear',
      isHuman: false,
      isLocal: false,
      timedOutAnimalName: 'Owl',
    });
    expect(res.title).toBe('Bear wins!');
    expect(res.sub).toBe('Won on time (Owl ran out of time).');
  });

  it('formats online mode victory for local and remote players', () => {
    const localRes = formatWinDetails({
      mode: 'online',
      winnerAnimalName: 'Fox',
      isHuman: true,
      isLocal: true,
    });
    expect(localRes.title).toBe('Victory!');
    expect(localRes.sub).toBe('Goal line reached.');

    const remoteRes = formatWinDetails({
      mode: 'online',
      winnerAnimalName: 'Wolf',
      isHuman: true,
      isLocal: false,
    });
    expect(remoteRes.title).toBe('Wolf wins');
    expect(remoteRes.sub).toBe('Goal line reached.');
  });

  it('formats local pass-and-play victory', () => {
    const res = formatWinDetails({
      mode: 'local',
      winnerAnimalName: 'Owl',
      isHuman: true,
      isLocal: true,
    });
    expect(res.title).toBe('Owl wins');
    expect(res.sub).toBe('Goal line reached.');
  });
});
