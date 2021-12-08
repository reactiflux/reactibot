import { subDays, parseISO, format } from "date-fns";

/**
 * getFirstRun ensures that a newly created interval timer runs at consistent
 * times regardless of when the bot was started.
 * @param interval An interval in milliseconds
 * @param now optional A date object representing the current time
 * @returns A number representing the number of milliseconds before the next
 * scheduled run, given the provided interval and a constant first-run time of
 * Sunday at midnight.
 */
const getFirstRun = (interval: number, now = new Date()) => {
  return 0;
  const dayOfWeek = now.getDay();
  const sundayMidnight = subDays(
    parseISO(format(now, "yyyy-MM-dd")),
    dayOfWeek,
  );

  const diff = now.getTime() - sundayMidnight.getTime();
  return diff % interval;
};

/**
 * Schedule messages to run on a consistent interval, assuming a constant
 * first-run time of Sunday at midnight.
 * @param interval An interval in milliseconds
 * @param task A function to run every interval
 */
export const scheduleTask = (interval: number, task: () => void) => {
  setTimeout(() => {
    task();
    setInterval(task, interval);
  }, getFirstRun(interval));
};
