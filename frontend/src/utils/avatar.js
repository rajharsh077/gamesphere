export const avatarOptions = [
  { seed: 'solar', label: 'Solar' },
  { seed: 'nebula', label: 'Nebula' },
  { seed: 'mist', label: 'Mist' },
  { seed: 'ember', label: 'Ember' },
  { seed: 'frost', label: 'Frost' },
  { seed: 'orbit', label: 'Orbit' }
];

export const getAvatarUrl = (seed) =>
  `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(seed)}&backgroundColor=020617`;
