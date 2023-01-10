import { format } from "date-fns";

interface CreateNewThreadNameParameters {
  username: string;
}

export const createNewThreadName = ({
  username,
}: CreateNewThreadNameParameters) => {
  const formattedDate = format(new Date(), "HH-mm MMM d");

  const newThreadName = `${username} – ${formattedDate}`;

  return newThreadName;
};
