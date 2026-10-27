import baseStyles from './DialogBase.module.css';
import styles from './RulesDialog.module.css';
import { hudStore } from '../../hudStore';
import { Modal, DialogCloseButton, DialogHeader } from './Modal';

export function RulesDialog() {
  const open = hudStore.rulesOpen.value;

  const close = () => {
    hudStore.rulesOpen.value = false;
  };

  return (
    <Modal
      id="rules-dialog"
      open={open}
      onOpen={() => (hudStore.rulesOpen.value = true)}
      onClose={close}
    >
      <form class={baseStyles.form} method="dialog" onSubmit={(e) => { e.preventDefault(); close(); }}>
        <DialogCloseButton id="btn-rules-x" onClick={close} />
        <DialogHeader title="How to Play" />
        <ol class={styles.rules}>
          <li>
            <strong>Goal:</strong> Be the first player to reach the opposite side of the board.
          </li>
          <li>
            <strong>Turn:</strong> Either move your pawn one tile, or place a wall in a groove.
          </li>
          <li>
            <strong>Move:</strong> Step to an adjacent tile. Jump straight over an adjacent opponent; if a wall blocks the jump, step diagonally.
          </li>
          <li>
            <strong>Walls:</strong> Walls span two tiles. They cannot overlap, cross, or completely trap any player.
          </li>
          <li>
            <strong>Inventory:</strong> 10 walls each in 2-player games, 5 in 4-player games.
          </li>
        </ol>
        <div class={styles.strategyTips}>
          <h3>Pro Tips for Better Moves</h3>
          <ul class={styles.tipsList}>
            <li>
              <strong>Watch the Step Count:</strong> Check the step badge on player cards. If you lead by 2+ steps, rush to your goal! If you trail, drop a hedge to delay the opponent.
            </li>
            <li>
              <strong>Conserve Your Hedges:</strong> Don't waste walls early on an open board. Saving hedges for the endgame forces much longer, decisive detours.
            </li>
            <li>
              <strong>Build Snake Mazes:</strong> Combining horizontal and vertical walls forces opponents sideways across multiple lanes.
            </li>
            <li>
              <strong>Seize the Jump:</strong> Jumping directly over an opponent gains 2 steps of tempo in a single turn.
            </li>
            <li>
              <strong>Press 💡 Hint:</strong> Click the lightbulb or press <kbd>I</kbd> anytime during your turn for optimal move & hedge recommendations computed with lookahead!
            </li>
          </ul>
        </div>
        <p class={styles.keys}>
          <kbd>I</kbd> hint · <kbd>Z</kbd> undo · <kbd>C</kbd> camera · swipe animal to move · drag to orbit
        </p>
        <button class="primary-btn" type="submit" onClick={close}>
          Close
        </button>
      </form>
    </Modal>
  );
}
