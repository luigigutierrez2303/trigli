/** Termina la animación del pull-to-refresh cuando la recarga acaba, salga bien o mal. */
export async function finishRefresh(ev: Event, task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } finally {
    await (ev.target as HTMLIonRefresherElement).complete();
  }
}
