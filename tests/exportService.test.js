const exportService = require('../src/services/exportService');
const exportJob = require('../src/jobs/exportJob');

jest.mock('../src/jobs/exportJob');

describe('Export Service', () => {

  test('startFullExport should call job', (done) => {

    exportService.startFullExport('job1','consumer1','file.csv');

    setImmediate(() => {
      expect(exportJob.runFullExport).toHaveBeenCalled();
      done();
    });

  });


  test('startIncrementalExport should call job', (done) => {

    exportService.startIncrementalExport('job2','consumer1','file.csv');

    setImmediate(() => {
      expect(exportJob.runIncrementalExport).toHaveBeenCalled();
      done();
    });

  });


  test('startDeltaExport should call job', (done) => {

    exportService.startDeltaExport('job3','consumer1','file.csv');

    setImmediate(() => {
      expect(exportJob.runDeltaExport).toHaveBeenCalled();
      done();
    });

  });

});