// Story packages and gameplay runtimes are intentionally selected separately.
// Keep this as a direct export: a combat game can point at CombatExperience without
// making the stealth engine carry hypothetical combat abstractions.
export { StealthExperience as ActiveExperience } from "../mechanics/stealth/StealthExperience";
