export default {
  id: 'example.circular-rooms',
  label: 'Circular Room Generator',
  generateRooms(config, rng) {
    const rooms = [];
    const radius = Math.max(config.minRoomSize, 4);
    for (let i = 0; i < config.roomCount; i++) {
      rooms.push({
        id: String(i + 1),
        kind: 'chamber',
        x: i * radius * 2,
        y: 0,
        w: radius,
        h: radius,
        shape: 'circular'
      });
    }
    return rooms;
  }
};
