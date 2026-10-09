export const logger = {
  info(message: string): void {
    console.log(`[${new Date().toISOString()}] INFO ${message}`);
  },

  error(message: string): void {
    console.error(`[${new Date().toISOString()}] ERROR ${message}`);
  },
};
