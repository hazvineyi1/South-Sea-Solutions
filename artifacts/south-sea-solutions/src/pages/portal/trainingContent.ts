import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Users,
  Gauge,
  BellRing,
  FileText,
  Activity,
  Clock,
  SlidersHorizontal,
  BadgeCheck,
  Globe,
  ShieldAlert,
} from "lucide-react";

export interface TrainingSection {
  heading: string;
  body?: string;
  steps?: string[];
  bullets?: string[];
  tip?: string;
  warning?: string;
}

export interface TrainingModule {
  slug: string;
  title: string;
  summary: string;
  category: string;
  icon: LucideIcon;
  minutes: number;
  sections: TrainingSection[];
}

export const TRAINING_CATEGORIES = [
  "Getting started",
  "Daily operations",
  "ELD and hours of service",
  "Compliance",
] as const;

export const trainingModules: TrainingModule[] = [
  {
    slug: "welcome-to-drivewise",
    title: "Welcome to Drivewise",
    summary: "What the platform does and how to find your way around it.",
    category: "Getting started",
    icon: Compass,
    minutes: 4,
    sections: [
      {
        heading: "What Drivewise is",
        body: "Drivewise is a driver-risk and certification platform for commercial transport operators in Botswana. It turns electronic logging data from your vehicles into live telemetry, hours-of-service clocks, safety alerts and certification tracking, all in one portal.",
      },
      {
        heading: "Signing in",
        steps: [
          "Open the portal and go to the sign-in page.",
          "Enter the email and password issued to you.",
          "You are routed automatically to the view that matches your role.",
        ],
      },
      {
        heading: "Finding your way around",
        bullets: [
          "The Drivewise logo (top left) returns you to your portal home.",
          "Training (top right) opens this learning center.",
          "Back to site (top right) returns you to the South Sea Solutions marketing site.",
          "Sign out ends your session securely.",
        ],
        tip: "Your landing page depends on your role: owners open the command center, and drivers see only their own record and truck.",
      },
    ],
  },
  {
    slug: "roles-and-access",
    title: "Roles and access",
    summary: "Who can see what across the portal, and why.",
    category: "Getting started",
    icon: Users,
    minutes: 4,
    sections: [
      {
        heading: "The two roles",
        bullets: [
          "Owner: the full command center, with live fleet telemetry, alerts, certification and rule setup.",
          "Driver: their own record and live telemetry for their own truck, nothing else.",
        ],
      },
      {
        heading: "Why drivers see only their own truck",
        body: "Each driver gets the telemetry that matters to them: speed, fuel, position and odometer for the vehicle they are assigned to. They cannot see other drivers or the wider fleet. Access is enforced at the data level, not just hidden on screen.",
      },
      {
        heading: "Multi-tenant safety",
        body: "Every screen is scoped to your own organisation. You never see another company's drivers, vehicles or data.",
        warning: "If you cannot reach a page, your role may not have access to it. Contact your administrator if you believe you should.",
      },
    ],
  },
  {
    slug: "command-center",
    title: "Reading the command center",
    summary: "The owner telemetry dashboard explained, metric by metric.",
    category: "Daily operations",
    icon: Gauge,
    minutes: 6,
    sections: [
      {
        heading: "Top telemetry metrics",
        bullets: [
          "Active vehicles: how many are on the road, split into moving and idling.",
          "Average speed: the mean speed of vehicles currently in motion.",
          "Fleet fuel: the average fuel level across the fleet.",
          "Fleet distance: the total odometer reading across all vehicles.",
        ],
      },
      {
        heading: "Compliance metrics",
        bullets: [
          "Fleet certified: the share of drivers meeting the Drivewise standard.",
          "Needs attention: drivers with an open item to review.",
          "Cross-border: vehicles currently on a cross-border corridor.",
          "Idling now: stationary vehicles reporting in.",
        ],
      },
      {
        heading: "The live telemetry list",
        body: "Each row shows the vehicle registration, status, certification, current speed, a fuel bar, odometer, location, and how long ago it last reported.",
        bullets: ["Tap any row to open that driver's full record."],
        tip: "A vehicle showing No signal has not reported recently. Check the last-seen time before you act on its data.",
      },
    ],
  },
  {
    slug: "managing-alerts",
    title: "Managing alerts",
    summary: "Spotting, understanding and acknowledging alerts.",
    category: "Daily operations",
    icon: BellRing,
    minutes: 5,
    sections: [
      {
        heading: "Where alerts appear",
        body: "Open alerts are listed in the Alerts tab of the command center. They flag drivers and vehicles that need a decision.",
      },
      {
        heading: "Severity levels",
        bullets: [
          "High (red): act now.",
          "Medium (amber): review soon.",
          "Low (blue): informational.",
        ],
      },
      {
        heading: "Common alert types",
        bullets: [
          "Hours exceeded or fatigue risk.",
          "Certification expiring or lapsed.",
          "Low fuel.",
          "Cross-border entry.",
        ],
      },
      {
        heading: "Acknowledging an alert",
        steps: [
          "Open the Alerts tab.",
          "Review the driver and the message.",
          "Click Acknowledge: the item moves to the Acknowledged list.",
        ],
        tip: "Click a driver name in an alert to jump straight to their record.",
        warning: "Acknowledging records that you have seen the alert. It does not fix the underlying issue, so always follow up with the driver.",
      },
    ],
  },
  {
    slug: "driver-records",
    title: "Working with driver records",
    summary: "The five tabs of a driver record and the audit trail.",
    category: "Daily operations",
    icon: FileText,
    minutes: 5,
    sections: [
      {
        heading: "Opening a record",
        body: "Tap any driver row in the command center, or click a driver name inside an alert.",
      },
      {
        heading: "The five tabs",
        bullets: [
          "Overview: a snapshot of the driver and their vehicle.",
          "Hours: the continuous, daily and weekly hours-of-service clocks.",
          "Safety: recorded incidents and their severity.",
          "Training: courses and certification progress.",
          "Documents: licences and supporting paperwork.",
        ],
      },
      {
        heading: "Audit trail",
        body: "Every time a driver record is opened, the access is logged for compliance.",
        tip: "Drivers can open only their own record. Owners can open any driver in their organisation.",
      },
    ],
  },
  {
    slug: "eld-basics",
    title: "ELD and electronic logging basics",
    summary: "What an electronic logging device records and why it matters.",
    category: "ELD and hours of service",
    icon: Activity,
    minutes: 6,
    sections: [
      {
        heading: "What an ELD is",
        body: "An Electronic Logging Device (ELD) automatically records driving time, movement and duty status directly from the vehicle. It replaces paper logbooks with accurate, tamper-resistant data.",
      },
      {
        heading: "What it captures",
        bullets: [
          "Engine and driving time.",
          "Movement and speed.",
          "Location pings along the route.",
          "Fuel level and odometer.",
        ],
      },
      {
        heading: "Duty status",
        bullets: [
          "Driving: the vehicle is in motion.",
          "On duty, not driving: working but stationary.",
          "Off duty or rest: the driver is resting.",
        ],
      },
      {
        heading: "Why it matters",
        body: "Reliable ELD data is the foundation of accurate hours-of-service tracking, fatigue prevention and audit-ready compliance records.",
        tip: "Drivewise turns raw ELD pings into the clocks, alerts and telemetry you see throughout the portal.",
      },
    ],
  },
  {
    slug: "hours-of-service",
    title: "Understanding hours-of-service clocks",
    summary: "The continuous, daily and weekly clocks and their statuses.",
    category: "ELD and hours of service",
    icon: Clock,
    minutes: 6,
    sections: [
      {
        heading: "The three clocks",
        bullets: [
          "Continuous driving: time since the last qualifying break.",
          "Daily driving: total driving in the current day.",
          "Weekly driving: total driving across the week.",
        ],
        body: "Each clock shows minutes used, the limit, and minutes remaining.",
      },
      {
        heading: "Statuses",
        bullets: [
          "OK (green): comfortably within the limit.",
          "Warning (amber): close to the limit.",
          "Exceeded (red): over the limit.",
        ],
      },
      {
        heading: "Breaks and rest",
        body: "A qualifying break resets the continuous clock. A full daily rest resets the daily clock. The weekly clock rolls across the operating week.",
        warning: "An Exceeded status means the driver is over a legal limit. Act promptly to reduce fatigue risk and avoid penalties.",
        tip: "Limits come from your rule profile. Adjust them in Setup if your operating rules change.",
      },
    ],
  },
  {
    slug: "rule-profiles",
    title: "Configuring hours-of-service rule profiles",
    summary: "Setting the hours-of-service limits for your whole fleet.",
    category: "ELD and hours of service",
    icon: SlidersHorizontal,
    minutes: 5,
    sections: [
      {
        heading: "Where to find it",
        body: "Open the Setup tab in the command center to view and edit your rule profile.",
      },
      {
        heading: "What you can set",
        bullets: [
          "Maximum continuous driving.",
          "Maximum daily driving.",
          "Maximum weekly driving.",
          "Minimum break.",
          "Minimum daily rest.",
        ],
        body: "All values are in minutes.",
      },
      {
        heading: "Saving changes",
        steps: [
          "Open the Setup tab.",
          "Edit the values you want to change.",
          "Click Save changes: the new limits apply across your fleet immediately.",
        ],
        warning: "Rule changes affect every driver's clocks and alerts. Make sure new limits match your legal and contractual obligations before saving.",
      },
    ],
  },
  {
    slug: "certification",
    title: "Certification and the Drivewise standard",
    summary: "Keeping your fleet certified and ahead of expiries.",
    category: "Compliance",
    icon: BadgeCheck,
    minutes: 4,
    sections: [
      {
        heading: "Certification statuses",
        bullets: [
          "Certified: the driver meets the Drivewise standard.",
          "In progress: working through required courses.",
          "Lapsed or expired: certification needs renewal.",
        ],
      },
      {
        heading: "Fleet certified percentage",
        body: "This is the share of your drivers meeting the Drivewise standard. Keeping it high is a direct measure of fleet readiness.",
      },
      {
        heading: "Keeping drivers certified",
        bullets: [
          "Complete required courses on the Training tab.",
          "Renew certification before it expires.",
          "Watch for certification-expiring alerts.",
        ],
        tip: "Certification-expiring alerts give you time to act before a driver lapses.",
      },
    ],
  },
  {
    slug: "cross-border",
    title: "Cross-border corridor operations",
    summary: "Handling regional cross-border trips with confidence.",
    category: "Compliance",
    icon: Globe,
    minutes: 4,
    sections: [
      {
        heading: "What the flag means",
        body: "When a vehicle is on a recognised cross-border corridor, Drivewise flags it so you can give the trip extra attention.",
      },
      {
        heading: "Why it matters",
        bullets: [
          "Different rules and documentation apply.",
          "Trips are longer, raising fatigue risk.",
          "Delays at the border affect the schedule.",
        ],
      },
      {
        heading: "What to check",
        bullets: [
          "Driver certification is valid.",
          "Documents are in order.",
          "There is enough hours headroom for the full trip.",
        ],
        tip: "The cross-border count appears on the command center alongside the rest of your fleet metrics.",
      },
    ],
  },
  {
    slug: "safety-incidents",
    title: "Safety incidents and follow-up",
    summary: "Reviewing and responding to recorded safety incidents.",
    category: "Compliance",
    icon: ShieldAlert,
    minutes: 4,
    sections: [
      {
        heading: "Where incidents live",
        body: "Recorded incidents appear on the Safety tab of each driver record.",
      },
      {
        heading: "Severity",
        bullets: ["High: serious, act now.", "Medium: review soon.", "Low: note and monitor."],
      },
      {
        heading: "Following up",
        steps: [
          "Open the driver record.",
          "Review the Safety tab and note the severity and details.",
          "Take corrective action: coaching, rest, or maintenance as appropriate.",
        ],
        tip: "Repeated incidents for one driver are a signal to review their hours and training.",
      },
    ],
  },
];

export function getTrainingModule(slug: string): TrainingModule | undefined {
  return trainingModules.find((m) => m.slug === slug);
}
