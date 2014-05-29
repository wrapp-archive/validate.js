describe("validate", function() {
  var validators = validate.validators
    , fail
    , fail2
    , pass
    , pass2;

  beforeEach(function() {
    fail = jasmine.createSpy('failValidator').andReturn("my error");
    fail2 = jasmine.createSpy('failValidator2').andReturn("my error");
    pass = jasmine.createSpy('passValidator');
    pass2 = jasmine.createSpy('passValidator2');
    validators.pass = pass;
    validators.pass2 = pass2;
    validators.fail = fail;
    validators.fail2 = fail2;
  });

  afterEach(function() {
    delete validators.fail;
    delete validators.fail2;
    delete validators.pass;
    delete validators.pass2;
  });

  it("raises an error if a promise is returned", function() {
    fail.andReturn(validate.Promise(function() {}));
    var constraints = {name: {fail: true}};
    expect(function() { validate({}, constraints); }).toThrow();
  });

  it("runs as expected", function() {
    var attributes = {
      name: "Nicklas Ansman",
      email: "nicklas@ansman.se"
    };
    var constraints = {
      name: {
        pass: true
      },
      email: {
        pass: true,
        fail: true,
        fail2: true
      }
    };

    fail.andReturn("must be a valid email address");
    fail2.andReturn("is simply not good enough");

    expect(validate(attributes, constraints)).toEqual({
      email: [
        "Email must be a valid email address",
        "Email is simply not good enough"
      ]
    });

    expect(validate(attributes, constraints, {flatten: true})).toEqual([
      "Email must be a valid email address",
      "Email is simply not good enough"
    ]);
  });

  describe("runValidations", function() {
    it("throws an error when the validator is not found", function() {
      expect(function() {
        validate.runValidations({}, {name: {foobar: true}}, {});
      }).toThrow("Unknown validator foobar");
    });

    it("calls the validator with the validator itself as context", function() {
      validate.runValidations({}, {name: {pass: true}}, {});
      expect(pass).toHaveBeenCalledWithContext(pass);
    });

    it("calls the validator with the val, opts, key and attributes", function() {
      var options = {someOption: true}
        , attributes = {someAttribute: 'some value'}
        , constraints = {someAttribute: {pass: options}};
      validate.runValidations(attributes, constraints, {});
      expect(pass).toHaveBeenCalledWith('some value',
                                        options,
                                        'someAttribute',
                                        attributes);
    });

    it("returns an array of results", function() {
      fail.andReturn("foobar");
      fail2.andReturn(["foo", "bar"]);
      pass.andReturn(null);

      var options = {someOption: true}
        , constraints = {name: {fail: true, fail2: true, pass: true}};
      var result = validate.runValidations({}, constraints, {});

      expect(result).toHaveItems([{
        attribute: "name",
        error: "foobar"
      }, {
        attribute: "name",
        error: ["foo", "bar"],
      }, {
        attribute: "name",
        error: null
      }]);
    });

    it("validates all attributes", function() {
      fail.andReturn("error");
      var constraints = {
        attr1: {pass: true},
        attr2: {fail: true},
        attr3: {fail: true}
      };
      expect(validate.runValidations({}, constraints, {})).toHaveItems([
        {attribute: "attr1", error: undefined},
        {attribute: "attr2", error: "error"},
        {attribute: "attr3", error: "error"}
      ]);
    });

    it("allows the options for an attribute to be a function", function() {
      var options = {pass: {option1: "value1"}}
        , attrs = {name: "Nicklas"}
        , spy = jasmine.createSpy("options").andReturn(options)
        , constraints = {name: spy};
      validate.runValidations(attrs, constraints, {});
      expect(spy).toHaveBeenCalledWith("Nicklas", attrs, "name");
      expect(pass).toHaveBeenCalledWith("Nicklas", options.pass, "name", attrs);
    });

    it("allows the options for a validator to be a function", function() {
      var options = {option1: "value1"}
        , attrs = {name: "Nicklas"}
        , spy = jasmine.createSpy("options").andReturn(options)
        , constraints = {name: {pass: spy}};
      validate.runValidations(attrs, constraints, {});
      expect(spy).toHaveBeenCalledWith("Nicklas", attrs, "name");
      expect(pass).toHaveBeenCalledWith("Nicklas", options, "name", attrs);
    });

    it("doesnt run the validations if the options are falsy", function() {
      validate.runValidations({}, {name: {pass: false}, email: {pass: null}}, {});
      expect(pass).not.toHaveBeenCalled();
    });

    it("validates objects nested one level deep", function() {
      fail.andReturn("error");

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
        error: "error"
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

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address",
        error: undefined
      }, {
        attribute: "address.home",
        error: "error"
      }, {
        attribute: "address.home.postal_code",
        error: undefined
      }, {
        attribute: "address.work",
        error: undefined
      }, {
        attribute: "address.work.postal_code",
        error: "error"
      }]);
    });

    it("handles one level deep objects with missing content", function() {
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

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address.home",
        error: "error"
      }]);
    });

    it("handles two level deep objects with missing content", function() {
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

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address",
        error: undefined
      }]);
    });

    it("handles objects with missing content", function() {
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
                postal_code: {
                  pass: true
                }
              }
            },
            work: {
              fail: true
            }
          }
        }
      };

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address",
        error: undefined
      }, {
        attribute: "address.work",
        error: 'error'
      }]);
    });

    it("handles objects with extra attributes", function() {
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

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address.school",
        error: "was not expected"
      }]);
    });

    it("handles objects with extra attributes two levels deep", function() {
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

      fail.andReturn("error");
      var result = validate.runValidations(attributes, constraints, {});

      expect(result).toHaveItems([{
        attribute: "address.work.number",
        error: "was not expected"
      }]);
    });
  });

  describe("processValidationResults", function() {
    var pvr = validate.processValidationResults;

    it("allows the validator to return a string", function() {
      var results = [{attribute: "name", error: "foobar"}];
      expect(pvr(results, {})).toEqual({name: ["Name foobar"]});
    });

    it("allows the validator to return an array", function() {
      var results = [{attribute: "name", error: ["foo", "bar"]}];
      expect(pvr(results, {})).toEqual({name: ["Name foo", "Name bar"]});
    });

    it("supports muliple entries for the same attribue", function() {
      var results = [
        {attribute: "name", error: ["foo", "bar"]},
        {attribute: "name", error: "baz"}
      ];
      expect(pvr(results, {})).toEqual({
        name: ["Name foo", "Name bar", "Name baz"]
      });
    });
  });

  describe("fullMessages", function() {
    it("calls fullMessages regardless of the fullMessages option", function() {
      spyOn(validate, 'fullMessages');
      var options = {option1: "value1", fullMessages: false}
        , constraints = {name: {fail: true}};

      validate({}, constraints, options);
      expect(validate.fullMessages).toHaveBeenCalledWith(
        {name: ["my error"]},
        options
      );

      options.fullMessages = true;
      validate({}, constraints, options);
      expect(validate.fullMessages).toHaveBeenCalledWith(
        {name: ["my error"]},
        options
      );
    });
  });
});
