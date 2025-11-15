

function formatOpSuffix(opN: number): string {
  const j = opN % 10;
  const k = opN % 100;

  let suffix = "th";
  if (k !== 11 && k !== 12 && k !== 13) {
    if (j === 1) suffix = "st";
    else if (j === 2) suffix = "nd";
    else if (j === 3) suffix = "rd";
  }

  return `${opN}${suffix} op`; // ex: "2nd op"
}


function formatPreOpSuffix(opN: number): string {
  const j = opN % 10;
  const k = opN % 100;

  let suffix = "th";
  if (k !== 11 && k !== 12 && k !== 13) {
    if (j === 1) suffix = "st";
    else if (j === 2) suffix = "nd";
    else if (j === 3) suffix = "rd";
  }

  return `${opN}${suffix} pre-op`; 
}


function formatPostOpSuffix(opN: number): string {
  const j = opN % 10;
  const k = opN % 100;

  let suffix = "th";
  if (k !== 11 && k !== 12 && k !== 13) {
    if (j === 1) suffix = "st";
    else if (j === 2) suffix = "nd";
    else if (j === 3) suffix = "rd";
  }

  return `${opN}${suffix} post-op`;
}


export function normalizeVisit(raw: string) {
  if (!raw) return null;

  let v = raw.trim().toLowerCase();

  v = v
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();  

  const keywords = [
    "pre",
    "post",
    "day",
    "week",
    "month",
    "year",
    "op",
    "operation",
  ];

  const isValid = keywords.some((k) => v.includes(k));

  if (!isValid) return null;

  // DAYS
  if (v.includes("day")) {

    const dayMatch = v.match(/(\d+)\s*day[s]?/);
    if (!dayMatch) return null; 

    const n = parseInt(dayMatch[1], 10);

    let opNumMatch =
      v.match(/op\s*(\d+)/) ||            // op2 / op 2
      v.match(/(\d+)\s*op/) ||            // 2op
      v.match(/post\s*op\s*(\d+)/) ||     // post op 2
      v.match(/pre\s*op\s*(\d+)/) ||      // pre op 2
      v.match(/postop\s*(\d+)/) ||        // postop2
      v.match(/preop\s*(\d+)/) ||         // preop2
      v.match(/day[s]?\s*(\d+)/) ||       // day2
      v.match(/(\d+)$/);                  // 5days2

    let opN = opNumMatch ? parseInt(opNumMatch[1], 10) : null;

    let label = `${n} day${n > 1 ? "s" : ""}`;

    if (opN && opN > 1) {
      label += ` (${formatOpSuffix(opN)})`;
    }

    return { value: label, label };
  }

  // WEEKS
  if (v.includes("week")) {
    const weekMatch = v.match(/(\d+)\s*week[s]?/);
    if (!weekMatch) return null;

    const n = parseInt(weekMatch[1], 10);

    let opNumMatch =
      v.match(/op\s*(\d+)/) ||
      v.match(/(\d+)\s*op/) ||
      v.match(/post\s*op\s*(\d+)/) ||
      v.match(/pre\s*op\s*(\d+)/) ||
      v.match(/postop\s*(\d+)/) ||
      v.match(/preop\s*(\d+)/) ||
      v.match(/week[s]?\s*(\d+)/) ||
      v.match(/(\d+)$/);

    let opN = opNumMatch ? parseInt(opNumMatch[1], 10) : null;

    let label = `${n} week${n > 1 ? "s" : ""}`;

    if (opN && opN > 1) {
      label += ` (${formatOpSuffix(opN)})`;
    }

    return { value: label, label };
  }

  // MONTHS
  if (v.includes("month")) {
    const monthMatch = v.match(/(\d+)\s*month[s]?/);
    if (!monthMatch) return null;

    let n = parseInt(monthMatch[1], 10);

    if (n % 12 === 0) {
      const years = n / 12;

      let opNumMatch =
        v.match(/op\s*(\d+)/) ||
        v.match(/(\d+)\s*op/) ||
        v.match(/post\s*op\s*(\d+)/) ||
        v.match(/pre\s*op\s*(\d+)/) ||
        v.match(/postop\s*(\d+)/) ||
        v.match(/preop\s*(\d+)/) ||
        v.match(/month[s]?\s*(\d+)/) ||
        v.match(/(\d+)$/);

      let opN = opNumMatch ? parseInt(opNumMatch[1], 10) : null;

      let label = `${years} year${years > 1 ? "s" : ""}`;
      if (opN && opN > 1) {
        label += ` (${formatOpSuffix(opN)})`;
      }

      return { value: label, label };
    }

    let opNumMatch =
      v.match(/op\s*(\d+)/) ||
      v.match(/(\d+)\s*op/) ||
      v.match(/post\s*op\s*(\d+)/) ||
      v.match(/pre\s*op\s*(\d+)/) ||
      v.match(/postop\s*(\d+)/) ||
      v.match(/preop\s*(\d+)/) ||
      v.match(/month[s]?\s*(\d+)/) ||
      v.match(/(\d+)$/);

    let opN = opNumMatch ? parseInt(opNumMatch[1], 10) : null;

    let label = `${n} month${n > 1 ? "s" : ""}`;

    if (opN && opN > 1) {
      label += ` (${formatOpSuffix(opN)})`;
    }

    return { value: label, label };
  }

  // YEARS
  if (v.includes("year")) {
    const yearMatch = v.match(/(\d+)\s*year[s]?/);
    if (!yearMatch) return null;

    const n = parseInt(yearMatch[1], 10);

    let opNumMatch =
      v.match(/op\s*(\d+)/) ||          // op2 / op 2
      v.match(/(\d+)\s*op/) ||          // 2op
      v.match(/post\s*op\s*(\d+)/) ||   // post op 2
      v.match(/pre\s*op\s*(\d+)/) ||    // pre op 2
      v.match(/postop\s*(\d+)/) ||      // postop2
      v.match(/preop\s*(\d+)/) ||       // preop2
      v.match(/year[s]?\s*(\d+)/) ||    // year2
      v.match(/(\d+)$/);                // 1year2, 2year3

    let opN = opNumMatch ? parseInt(opNumMatch[1], 10) : null;

    let label = `${n} year${n > 1 ? "s" : ""}`;

    if (opN && opN > 1) {
      label += ` (${formatOpSuffix(opN)})`;
    }

    return { value: label, label };
  }

  // PRE-OP
  if (v.includes("pre")) {

  let preNumMatch =
    v.match(/pre\s*op\s*(\d+)/) ||   // pre op 2
    v.match(/preop\s*(\d+)/) ||      // preop2
    v.match(/pre\s*(\d+)/) ||        // pre 2
    v.match(/(\d+)\s*pre\s*op/) ||   // 2 pre op
    v.match(/(\d+)\s*preop/) ||      // 2preop
    v.match(/(\d+)ndpreop/) ||
    v.match(/(\d+)\s*pre\s*op/) ||   // 2nd pre-op → "2 pre op"
    v.match(/pre\s*op/) ||           // pre op
    v.match(/preop/);                // preop

    let opN = preNumMatch && preNumMatch[1]
      ? parseInt(preNumMatch[1], 10)
      : null;

    let label = "pre-op";
    if (opN && opN > 1) {
      label = `${formatPreOpSuffix(opN)}`;
    }

    return { value: label, label };
  }

  // POST-OP
  if (v.includes("post")) {

    let postNumMatch =
      v.match(/post\s*op\s*(\d+)/) ||   // post op 2
      v.match(/postop\s*(\d+)/) ||      // postop2
      v.match(/post\s*(\d+)/) ||        // post 2
      v.match(/(\d+)\s*post\s*op/) ||   // 2 post op
      v.match(/(\d+)\s*postop/) ||      // 2postop
      v.match(/(\d+)ndpostop/) ||       // 2ndPostOP
      v.match(/(\d+)\s*post\s*op/) ||   // "2 post op"
      v.match(/post\s*op/) ||           // post op
      v.match(/postop/);                // postop

    let opN = postNumMatch && postNumMatch[1]
      ? parseInt(postNumMatch[1], 10)
      : null;

    let label = "post-op";

    if (opN && opN > 1) {
      label = `${formatPostOpSuffix(opN)}`;
    }

    return { value: label, label };
  }

}

export function sortVisits(
  a: { label: string },
  b: { label: string }
) {
  const parseVisit = (label: string) => {
    const l = label.toLowerCase().trim();

    let opIndex = 1;

    const opGroupMatch = l.match(/\((\d+)(st|nd|rd|th)\s+op\)/);
    if (opGroupMatch) {
      opIndex = parseInt(opGroupMatch[1], 10);
    } else {
      const preMatch = l.match(/^(\d+)(st|nd|rd|th)\s+pre-op$/);
      const postMatch = l.match(/^(\d+)(st|nd|rd|th)\s+post-op$/);
      const m = preMatch || postMatch;
      if (m) {
        opIndex = parseInt(m[1], 10);
      }
    }

    let kindRank = 99;

    if (l.includes("pre-op")) {
      kindRank = 1;
    } else if (l.includes("post-op")) {
      kindRank = 2;
    } else if (l.includes("day")) {
      kindRank = 3;
    } else if (l.includes("week")) {
      kindRank = 4;
    } else if (l.includes("month")) {
      kindRank = 5;
    } else if (l.includes("year")) {
      kindRank = 6;
    }

    let duration = 0;

    if (kindRank === 3) {
      const m = l.match(/(\d+)\s*day/);
      if (m) duration = parseInt(m[1], 10);
    } else if (kindRank === 4) {
      const m = l.match(/(\d+)\s*week/);
      if (m) duration = parseInt(m[1], 10);
    } else if (kindRank === 5) {
      const m = l.match(/(\d+)\s*month/);
      if (m) duration = parseInt(m[1], 10);
    } else if (kindRank === 6) {
      const m = l.match(/(\d+)\s*year/);
      if (m) duration = parseInt(m[1], 10);
    }

    return { opIndex, kindRank, duration, label };
  };

  const pa = parseVisit(a.label);
  const pb = parseVisit(b.label);

  if (pa.opIndex !== pb.opIndex) {
    return pa.opIndex - pb.opIndex;
  }

  if (pa.kindRank !== pb.kindRank) {
    return pa.kindRank - pb.kindRank;
  }

  if (pa.duration !== pb.duration) {
    return pa.duration - pb.duration;
  }

  return pa.label.localeCompare(pb.label);
}
