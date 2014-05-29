describe('validator.properties', function() {
  beforeEach(function() {
    fail = jasmine.createSpy('failValidator').andReturn("my error");
    pass = jasmine.createSpy('passValidator');
    validate.validators.pass = pass;
    validate.validators.fail = fail;
  });

  afterEach(function() {
    delete validate.validators.fail;
    delete validate.validators.fail2;
    delete validate.validators.pass;
    delete validate.validators.pass2;
  });

  it("validates objects nested one level deep", function() {
    var attributes = {
      home: {
        postal_code: "94101"
      }
    };

    var constraints = {
      home: {
        properties: {
          postal_code: { pass: true },
        },
        fail: true
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "home",
      error: "my error"
    }, {
      attribute: "home.postal_code",
      error: undefined
    }]);
  });

  it("validates objects nested two levels deep", function() {
    var attributes = {
      address: {
        home: {
          postal_code: "94101"
        },
        work: {
          postal_code: "94301"
        }
      }
    };

    var constraints = {
      address: {
        pass: true,
        properties: {
          home: {
            properties: {
              postal_code: { pass: true },
            },
            fail: true
          },
          work: {
            properties: {
              postal_code: { fail: true },
            },
            pass: true
          }
        }
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "address",
      error: undefined
    }, {
      attribute: "address.home",
      error: "my error"
    }, {
      attribute: "address.home.postal_code",
      error: undefined
    }, {
      attribute: "address.work",
      error: undefined
    }, {
      attribute: "address.work.postal_code",
      error: "my error"
    }]);
  });

  it("runs validations on missing sub-objects", function() {
    var attributes = {
      address: {
      }
    };

    var constraints = {
      address: {
        properties: {
          home: {
            fail: true
          }
        }
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "address.home",
      error: "my error"
    }]);
  });

  it("doesn't try to descend into missing sub-objects", function() {
    var attributes = {
      address: {
      }
    };

    var constraints = {
      address: {
        pass: true,
        properties: {
          home: {
            properties: {
              postal_code: { fail: true }
            }
          }
        }
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "address",
      error: undefined
    }]);
  });

  it("complains about objects with extra attributes", function() {
    var attributes = {
      address: {
        school: {}
      }
    };

    var constraints = {
      address: {
        properties: { }
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "address.school",
      error: "was not expected"
    }]);
  });

  it("complains about objects with extra attributes two levels deep", function() {
    var attributes = {
      address: {
        work: {
          number: 42
        }
      }
    };

    var constraints = {
      address: {
        properties: {
          work: {
            properties: { }
          }
        }
      }
    };

    var result = validate.runValidations(attributes, constraints, {});

    expect(result).toHaveItems([{
      attribute: "address.work.number",
      error: "was not expected"
    }]);
  });
});

