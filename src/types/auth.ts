/** The signed-in player, as passed from the server to the UI. Null when playing as a guest. */
export type SessionUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};
