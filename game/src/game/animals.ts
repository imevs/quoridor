export type AnimalId = 'fox' | 'wolf_grey' | 'bear' | 'owl' | 'wolf_white';

export interface AnimalInfo {
  id: AnimalId;
  /** Root node name inside quoridor_board.glb */
  node: string;
  name: string;
  emoji: string;
  color: string;
}

export const ANIMALS: Record<AnimalId, AnimalInfo> = {
  fox: { id: 'fox', node: 'Animal_Fox', name: 'Fox', emoji: '🦊', color: '#ff8a3d' },
  wolf_grey: { id: 'wolf_grey', node: 'Animal_Wolf_Grey', name: 'Grey Wolf', emoji: '🐺', color: '#7fb2e5' },
  bear: { id: 'bear', node: 'Animal_Bear', name: 'Bear', emoji: '🐻', color: '#d4935a' },
  owl: { id: 'owl', node: 'Animal_Owl', name: 'Owl', emoji: '🦉', color: '#f5c94c' },
  wolf_white: { id: 'wolf_white', node: 'Animal_Wolf_White', name: 'Snow Wolf', emoji: '🐺', color: '#e6f0ff' },
};

export const ANIMAL_ORDER: AnimalId[] = ['fox', 'wolf_grey', 'bear', 'owl', 'wolf_white'];
