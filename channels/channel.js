
'use strict';

class Channel {
  /**
   * Busca novas mensagens e as retorna normalizadas.
   * @returns {Promise<import('../models/message').RawMessage[]>}
   */
  async fetchNewMessages() {
    throw new Error('fetchNewMessages() não implementado');
  }
}

module.exports = Channel;
