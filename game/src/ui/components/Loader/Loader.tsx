import styles from './Loader.module.css';
import { hudStore } from '../../hudStore';

export function Loader() {
  const p = hudStore.loadingProgress.value;
  const done = hudStore.loadingDone.value;
  const percent = Math.round(p * 100);

  return (
    <div
      id="loader"
      class={`${styles.loader} ${done ? styles.done : ''}`}
      role="progressbar"
      aria-label="Loading board"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div class={styles.loaderCard}>
        <p class={styles.loaderTitle}>Quoridors</p>
        <div class={styles.loaderBar}>
          <span
            id="loader-fill"
            class={styles.loaderBarFill}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p class={styles.loaderText}>Loading 3D assets…</p>
      </div>
    </div>
  );
}
