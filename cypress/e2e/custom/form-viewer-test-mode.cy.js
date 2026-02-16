describe('Form Viewer test mode bootstrap', () => {
  it('boots in test mode and exposes formTestApi', () => {
    cy.visit('/form-viewer.html?testMode=1&autoLoad=0');

    cy.window({ timeout: 20000 }).should((win) => {
      expect(win.__formViewerBooted).to.equal(true);
      expect(win.__formViewerTestMode).to.equal(true);
      expect(win.formTestApi).to.exist;
      expect(win.formTestApi.isReady()).to.equal(false);
    });
  });
});
