var path = require('path'),
    Mocha = require('mocha'),
    mockery = require('mockery'),
    chai = require("chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    expect = chai.expect;

chai.use(sinonChai);

describe("Allure reporter", function() {
    var allureMock;
    var runtimeMock;
    var sandbox;
    var reporter;

    beforeEach(function(){
        sandbox = sinon.sandbox.create();
        mockery.enable({
            warnOnUnregistered: false,
            warnOnReplace: false,
            useCleanCache: true
        });
        allureMock = sandbox.stub({
                getCurrentTest: function(){},
                setOptions: function() {},
                startSuite: function() {},
                endSuite: function() {},
                getSuite: function() {},
                startCase: function() {},
                endCase: function() {},
                pendingCase: function() {}
            })
        allureMock.getCurrentTest.returns('a test');
        runtimeMock = sandbox.stub({
                createStep: function() {},
                createAttachment: function() {},
                addLabel: function() {}
            });
        runtimeMock.createStep.returns(function() {});
        runtimeMock.createAttachment.returns(function() {});


        mockery.registerMock('allure-js-commons', function() {
            return allureMock;
        });
        mockery.registerMock('allure-js-commons/runtime', function() {
            return runtimeMock;
        });
        reporter = require('../../');
    })

    afterEach(function(){
        sandbox.restore();
        mockery.disable();
    })

    it("should report test results", function(done) {
        var mocha = new Mocha({
            reporter: reporter
        });
        mocha.addFile(path.join(__dirname, '../fixtures/simple.spec.js'));
        mocha.run(function() {
            expect(allureMock.startSuite).callCount(3);
            expect(allureMock.startSuite.secondCall).calledWithExactly('A mocha suite');
            expect(allureMock.startSuite.thirdCall).calledWithExactly('A mocha suite passing');
            expect(allureMock.endSuite).callCount(3);

            expect(allureMock.startCase.firstCall).calledAfter(allureMock.startSuite.secondCall);
            expect(allureMock.startCase.firstCall).calledWithExactly('broken test');
            expect(allureMock.endCase.firstCall).calledWith('broken', sinon.match.instanceOf(Error));

            expect(allureMock.startCase.secondCall).calledWithExactly('failed test');
            expect(allureMock.endCase.secondCall).calledWith('failed', sinon.match.instanceOf(Error));

            expect(allureMock.startCase.thirdCall).calledWithExactly('simple test');
            expect(allureMock.endCase.thirdCall).calledWith('passed');

            expect(allureMock.pendingCase).calledOnce;
            expect(allureMock.pendingCase.firstCall).calledWith('pending test');
            done();
        })
    });
    it("should report test results if there is a failure in a before test hook", function(done) {
        allureMock.getCurrentTest.onFirstCall().returns(undefined);
        allureMock.getCurrentTest.onSecondCall().returns('a test');
        var mocha = new Mocha({
            reporter: reporter
        });
        mocha.addFile(path.join(__dirname, '../fixtures/before_all.spec.js'));
        mocha.run(function(status) {
            expect(allureMock.startSuite).callCount(4);
            expect(allureMock.startSuite.secondCall).calledWithExactly('Before all tests');
            expect(allureMock.startSuite.thirdCall).calledWithExactly('Before all tests broken before');
            expect(allureMock.startSuite.lastCall).calledWithExactly('Before all tests before not broken');
            expect(allureMock.endSuite).callCount(4);

            expect(allureMock.startCase.firstCall).calledAfter(allureMock.startSuite.secondCall);
            expect(allureMock.startCase.firstCall).calledWithExactly('"before all" hook');
            expect(allureMock.endCase.firstCall).calledWith('broken', sinon.match.instanceOf(Error));

            expect(allureMock.startCase.secondCall).calledWithExactly('a test');
            expect(allureMock.endCase).to.have.been.calledTwice;

            expect(status).to.be.equal(1);
            done();
        })
    });
});
