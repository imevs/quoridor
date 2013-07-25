var TestCase = function (origin) {
    return function (testCaseName, opt_proto, opt_type) {
        for (var key in opt_proto) if (opt_proto.hasOwnProperty(key)) {
            if (opt_proto[key] instanceof TestWithProvider) {
                var res = opt_proto[key].createTestMethods(key);
                delete opt_proto[key];

                for (var resKey in res) if (res.hasOwnProperty(resKey)) {
                    opt_proto[resKey] = res[resKey];
                }
            }
        }
        return origin(testCaseName, opt_proto, opt_type);
    };
}(TestCase);

var TestWithProvider = function(testObj) {
    var me = this;
    if (!(me instanceof arguments.callee)) {
        return new arguments.callee(testObj);
    }

    me.test = testObj.test;
    me.data = testObj.data;
    me.res = [];

    me.generateNewTestMethodName = function (testMethodName, testname) {
        var testNameFull = testMethodName.replace(/^_/g, '') + ' ' + (testname || '');
        var testName = testNameFull;
        var repeatCount = 1;
        while (me.res[testName]) {
            testName = testNameFull + ' ' + repeatCount++;
        }
        return testName;
    };

    me.getType = function(testInfo) {
        var expectedDataType = Object.prototype.toString.call(testInfo.expected);
        return expectedDataType.substring(8, expectedDataType.length - 1).toLowerCase();
    };

    me.retrieveExpectedValue = function (testInfo) {
        var expectedDataType = me.getType(testInfo);
        if (testInfo.expectedFileName) {
            return me.proxy(getFixterData, testInfo.expectedFileName);
        } else if (expectedDataType == 'string' || expectedDataType == 'boolean') {
            return testInfo.expected;
        } else if (expectedDataType == 'array') {
            for (var j = 0; j < testInfo.expected.length; j++) {
                var expected = testInfo.expected[j];
                if (expected['condition']() == true) {
                    return !expected.dataFileName ? expected.data : me.proxy(getFixterData, expected.dataFileName);
                }
            }
        }
        return null;
    };

    me.isFunction = function(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    };

    me.proxy = function (func, args) {
        var bindArgs = [].slice.call(arguments, 1);
        return function () {
            var args = [].slice.call(arguments);
            var unshiftArgs = bindArgs.concat(args);
            for (var i = 0; i < unshiftArgs.length; i++) {
                var obj = unshiftArgs[i];
                if (me.isFunction(obj)) {
                    unshiftArgs[i] = obj();
                }
            }
            return func.apply(this, unshiftArgs);
        };
    };

    me.checkArguments = function (testInfo) {
        if (testInfo.expected == null && testInfo.expectedFileName == null) {
            testInfo.expected = '';
        }

        if (testInfo.input == null && testInfo.inputFileName == null) {
            testInfo.input = '';
        }

        return testInfo;
    };

    me.createTestMethods = function (testMethodName) {
        var data, isValidTestWithDataprovider = me.data && me.test;
        if (!isValidTestWithDataprovider) {
            return me;
        }
        data = me.isFunction(me.data) ? me.data() : me.data;
        for (var i = 0; i < data.length; i++) {
            var testInfo = me.checkArguments(data[i]),
                input = testInfo.inputFileName ? me.proxy(getFixterData, testInfo.inputFileName) : testInfo.input,
                testName = me.generateNewTestMethodName(testMethodName, testInfo.testname),
                expected = me.retrieveExpectedValue(testInfo);


            me.res[testName] = me.proxy(me.test, input, expected);

            if (expected === null) {
                jstestdriver.console.log('Test: ["' + testName + '"] skipped on ' + CKEDITOR.env.getEnvDescription());
            }
        }
        return me.res;
    };

    return me;
};