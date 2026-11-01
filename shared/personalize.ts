import type { Intake } from "./plan";

export interface Personalization {
  ideas: string[];
  vendors: string[];
}
interface Part {
  ideas: string[];
  vendors: string[];
}
const none: Part = { ideas: [], vendors: [] };
const clip = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 180);

const themePart = (vibe: string): Part =>
  vibe
    ? {
        ideas: [
          `Carry the “${vibe}” theme through invitations, décor colours and a signature welcome drink.`,
        ],
        vendors: [],
      }
    : none;

function dietPart(text: string): Part {
  if (/jain/.test(text)) {
    return {
      ideas: ["Offer a clearly labelled Jain menu (no root vegetables) and brief the caterer in writing."],
      vendors: ["Written Jain menu sign-off"],
    };
  }
  if (/vegan/.test(text)) {
    return {
      ideas: ["Build the menu around vegan dishes so every guest can eat everything."],
      vendors: ["Written vegan menu sign-off"],
    };
  }
  if (/\bveg(etarian)?\b/.test(text)) {
    return { ideas: ["Go fully vegetarian — simpler catering and suits every guest."], vendors: [] };
  }
  return none;
}

const accessPart = (text: string): Part =>
  /wheelchair|accessib|elderly|senior|mobility/.test(text)
    ? {
        ideas: ["Choose a step-free venue with accessible restrooms and reserved seating near the entrance."],
        vendors: ["Venue accessibility walk-through"],
      }
    : none;

const outdoorPart = (text: string): Part =>
  /outdoor|garden|beach|terrace|lawn/.test(text)
    ? {
        ideas: ["Keep a covered backup area for rain, and plan shade, water and mosquito control."],
        vendors: ["Rain / weather backup plan"],
      }
    : none;

const kidsPart = (text: string): Part =>
  /kid|child/.test(text)
    ? { ideas: ["Set up a supervised kids’ corner with games so parents can relax."], vendors: [] }
    : none;

function sizeIdea(guests: number): string {
  if (guests <= 25) {
    return "Keep it intimate: a seated menu and one shared activity.";
  }
  if (guests <= 100) {
    return "Use live food stations so guests mingle instead of queueing.";
  }
  return "Run two serving lines and a staffed welcome desk to keep queues short.";
}

function budgetIdea(perGuest: number): string {
  if (perGuest < 1500) {
    return `At about ₹${perGuest} per guest, put money into food and venue; DIY décor stretches the budget.`;
  }
  if (perGuest < 4000) {
    return `At about ₹${perGuest} per guest you can afford one standout feature — live music, a photo booth or a signature dessert.`;
  }
  return `At about ₹${perGuest} per guest, invest in an experience: a live act, premium catering or a custom set.`;
}

/**
 * Deterministic, offline personalisation from the intake form (theme, diet, accessibility, setting,
 * guest count, budget per head, city). The AI enriches these ideas; it never replaces the guarantee
 * that every plan is tailored to the person's inputs.
 */
export function personalize(m: Intake): Personalization {
  const text = `${m.vibe} ${m.notes}`.toLowerCase();
  const parts = [themePart(m.vibe), dietPart(text), accessPart(text), outdoorPart(text), kidsPart(text)];
  const cityIdea = m.city ? [`Book ${m.city} vendors early — weekend and festive dates fill up first.`] : [];
  const ideas = [
    ...parts.flatMap((p) => p.ideas),
    sizeIdea(m.guests),
    budgetIdea(Math.round(m.budget / m.guests)),
    ...cityIdea,
  ];
  return { ideas: ideas.map(clip), vendors: parts.flatMap((p) => p.vendors) };
}
