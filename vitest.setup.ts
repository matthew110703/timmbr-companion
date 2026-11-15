interface GlobalExpo {
  EventEmitter: new () => {
    addListener: () => { remove: () => void };
    removeListener: () => void;
    emit: () => void;
  };
  modules: Record<string, unknown>;
}

const globalWithExpo = globalThis as unknown as {
  expo?: GlobalExpo;
  __DEV__?: boolean;
};

if (typeof globalWithExpo.__DEV__ === 'undefined') {
  globalWithExpo.__DEV__ = false;
}

if (typeof globalWithExpo.expo === 'undefined') {
  globalWithExpo.expo = {
    EventEmitter: class MockEventEmitter {
      addListener() {
        return { remove: () => {} };
      }
      removeListener() {}
      emit() {}
    },
    modules: {},
  };
}
