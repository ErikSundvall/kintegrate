describe('Form Viewer Test Mode (PoC)', () => {
  it('exposes formTestApi and reads form info', () => {
    const baseUrl = Cypress.config('baseUrl') || 'http://localhost:4173';
    cy.visit(`${baseUrl}/form-viewer#testMode=1&autoLoad=1`);
    cy.window({ timeout: 20000 }).should((win) => {
      if (!win.__formViewerBooted) {
        throw new Error('Form viewer script did not boot.');
      }
      if (!win.__formViewerSearch?.includes('testMode=1')) {
        throw new Error(`Unexpected search/hash: ${win.__formViewerSearch || '<empty>'}`);
      }
      if (!win.__formViewerTestMode) {
        throw new Error('Test mode is not enabled in form viewer.');
      }
    });
    cy.waitForFormTestApi();
    cy.waitForFormReady();

    cy.window().then((win) => {
      const info = win.formTestApi.getFormInfo?.();
      expect(info, 'form info is available').to.exist;
    });
  });
});
