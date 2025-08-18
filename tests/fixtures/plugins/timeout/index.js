export default {
  id: 'test.timeout',
  label: 'Timeout Plugin',
  initialize() {
    while (true) {}
  },
  enrich(d) { return d; }
};
