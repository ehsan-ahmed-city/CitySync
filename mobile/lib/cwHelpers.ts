export type CourseworkDto = {
  id: number;
  moduleId: number;
  userId: number;
  title: string;
  dueDate: string;
  weighting: number | null;

  //completion fields
  completed?: boolean;
  completedAt?: string | null;
  scorePercent?: number | null;

  onSite?: boolean;
  location?: String | null;//whether cw is in-person or not
};

export function calcGrade(cwItems: CourseworkDto[]) {
  //uses only coursework with weightings
  const withWeight = cwItems.filter((c) => c.weighting != null && c.weighting > 0);
  if (withWeight.length === 0) return null;

  const allocWeight = withWeight.reduce((sum, c) => sum + c.weighting!, 0); //allocated weight

  const confirmedMark = withWeight .filter((c) => c.scorePercent != null) .reduce((sum,c)=> sum + (c.weighting! * c.scorePercent! / 100), 0);
  const completedWeight = withWeight
    .filter((c) => c.completed)
    .reduce((sum, c) => sum + c.weighting!, 0);

  const remainingWeight = Math.max(0,allocWeight - completedWeight);

  //minimum is 0 on remaining coursework
  const predictedMin = Math.round(confirmedMark);
  //max is 100 on remaining coursework
  const predictedMax = Math.min(100, Math.round(confirmedMark + remainingWeight));

  return {
    allocWeight, confirmedMark ,completedWeight,
    remainingWeight, predictedMin,predictedMax,
  };

}



export function getModuleWeightTotal(moduleId: number, coursework: CourseworkDto[], excludeCourseworkId?: number){
    return coursework.filter(c => c.moduleId === moduleId).filter(c => excludeCourseworkId == null || c.id !== excludeCourseworkId)
    .reduce((sum, c) => sum + (c.weighting ?? 0), 0);

}


export function formatDate(date: Date){
  //^js date object to datetime string for backend
  const year = date.getFullYear();
  const month = String(date.getMonth() +1).padStart(2, "0");//using pastart sp it's like 01 or 03 instead of 1 or 3
  const day = String(date.getDate()).padStart(2, "0");
  //^this also padded to 2 digits

  const hours = String(date.getHours()).padStart(2,"0");
  const mins = String(date.getMinutes()).padStart(2,"0");
  const secs="00";//seconds dont matter

   return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;

}

export function formatTime(date: Date) {
    //only time portion of date for ui
    const hours = String(date.getHours()).padStart(2,"0");
    const mins = String(date.getMinutes()).padStart(2,"0");

    return `${hours}:${mins}`;

}

export function daysUntil(dateTimeString: string) {
    const due = new Date(dateTimeString);
    const ms = due.getTime() - Date.now();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }


export function gradeLabel(pct: number) {

  if (pct >= 70) return "First (1st)";
  if (pct >= 60) return "2:1";
  if (pct >= 50) return "2:2";
  if (pct >= 40) return "Third";
  return "Fail";
}

export function gradeColour(pct: number) {

  if (pct >= 70) return "#22C55E";
  if (pct >= 60) return "#D70E20";
  if (pct >= 50) return "#F59E0B";
  if (pct >= 40) return "#F97316";
  return "#EF4444";

}

export function getReminderLevel(daysLeft: number) {
  //reminders for how close a coursework is
    if (daysLeft <= 0) return { label: "OVERDUE", freq: "every 4 hours" };
    if (daysLeft <= 1) return { label: "URGENT", freq: "daily" };
    if (daysLeft <= 5) return { label: "SOON", freq: "every 2 days" };
    return { label: "NORMAL", freq: "weekly" };
  }


