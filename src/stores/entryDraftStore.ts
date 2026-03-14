import { create } from "zustand";

interface EntryDraftState {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export const useEntryDraftStore = create<EntryDraftState>((set) => ({
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),
}));
