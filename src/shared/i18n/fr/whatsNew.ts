// Écran « Quoi de neuf » (une fois par version) : ton chaleureux, tutoiement.
export const whatsNew = {
  title: 'Quoi de neuf dans AV·WAN 1.5 ✨',
  intro: 'Une mise à jour pleine de petites attentions pour tes régies, tes serveurs et tes machines virtuelles. Bonne découverte !',
  items: [
    { title: 'Plusieurs IP par port', text: 'Chaque port réseau accueille autant d’adresses que tu veux : « + IP », en statique ou en DHCP.' },
    { title: 'Cartes et ports éditables', text: 'Ajoute une carte GPU, réseau ou capture, renomme ou retire des ports. Le DisplayPort fait son entrée.' },
    { title: 'Côté des prises par type', text: 'Réseau à gauche, vidéo à droite, alimentation en bas : chaque type de prise choisit son côté.' },
    { title: 'Des VMs dans la tuile de l’hôte', text: 'Tes machines virtuelles se nichent dans leur serveur, avec leurs vNIC pontées et leurs IP.' },
    { title: 'Section Matériel', text: 'OS, CPU, RAM, stockage et GPU, pour les machines physiques comme pour les VMs.' },
    { title: 'Des rapports plus riches', text: 'Le plan IP liste chaque adresse, VMs comprises, et les fiches montrent le matériel et les VMs.' }
  ],
  noteTitle: 'Bon à savoir',
  note: 'Les fichiers enregistrés en 1.5 ne s’ouvrent plus correctement dans la 1.4 ; une copie .bak de ton fichier d’origine est créée à côté de lui à la première ouverture.',
  close: 'C’est parti !'
} as const
