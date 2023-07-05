import { schedule as scheduleCron } from "node-cron";
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
  const dayOfWeek = now.getDay();
  const sundayMidnight = subDays(
    parseISO(format(now, "yyyy-MM-dd")),
    dayOfWeek,
  );

  const diff = now.getTime() - sundayMidnight.getTime();
  return diff % interval;
};

export const enum SPECIFIED_TIMES {
  "midnight" = "0 0 * * *",
}

const HOURLY = 60 * 60 * 1000;
// By keeping these off 24 hr, we can make sure they show up at all timezones. If
// it were 24 hours, for instance, it would consistently show up in the middle of
// the night for some timezones.
const DAILY = 20 * HOURLY;
export const FREQUENCY = {
  hourly: HOURLY,
  often: 9 * HOURLY,
  daily: DAILY,
  moreThanWeekly: 3 * DAILY,
  weekly: 6 * DAILY,
};

/**
 * Schedule messages to run on a consistent interval, assuming a constant
 * first-run time of Sunday at midnight.
 * @param interval An interval in milliseconds
 * @param task A function to run every interval
 */
export const scheduleTask = (
  name: string,
  interval: number | SPECIFIED_TIMES,
  task: () => void,
) => {
  if (typeof interval === "number") {
    const firstRun = getFirstRun(interval);
    console.log(
      `[INFO] Scheduling '${name}' task to run every ${Math.floor(
        interval / 1000 / 60,
      )}min, first run in ${Math.floor(firstRun / 1000 / 60)}min`,
    );
    setTimeout(() => {
      task();
      setInterval(task, interval);
    }, firstRun);
  } else {
    console.log(
      `[INFO] Scheduling '${name}' cron task to run on schedule \`${interval}\``,
    );
    scheduleCron(interval, () => {
      console.log(`[INFO] Running scheduled task '${name}'`);
      task();
    });
  }
};
