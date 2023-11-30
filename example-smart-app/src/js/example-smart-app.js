(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      console.log("smart : ", smart);
    if (smart.hasOwnProperty("patient")) {
      var patient = smart.patient;
      var pt = patient.read();
 
      pt.done(function (data) { sessionStorage.setItem('patientDetails', JSON.stringify(data)); });
 
      var obv = smart.patient.api.fetchAll({
        type: "Observation",
        query: {
          code: {
            $or: [
              "http://loinc.org|8302-2",
              "http://loinc.org|8462-4",
              "http://loinc.org|8480-6",
              "http://loinc.org|2085-9",
              "http://loinc.org|2089-1",
              "http://loinc.org|55284-4",
            ],
          },
        },
      });
 
      obv.done(function (data) { sessionStorage.setItem('observationDetails', JSON.stringify(data)); });
 
      var cov = smart.patient.api.fetchAll({
        type: "Coverage",
      });
 
      cov.done(function (data) { sessionStorage.setItem('coverageDetails', JSON.stringify(data)); });

       //https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Coverage?patient=eTjDDWfopD0BnRlyEO2mGZQ3
	const host = 'fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/';
      // Specify the base URL
      const covBaseUrl = `https://${host}/Coverage`;
 
 
      // Construct the URL with query parameters
      const covApiUrl = `${covBaseUrl}?patient=${patient.id}`;
      const bearerToken = JSON.parse(sessionStorage.getItem('tokenResponse'));
      const access_token = bearerToken.access_token;
      var coverageDetails;
      const fetchOptions = {
        method: "GET", // or "POST", "PUT", etc.
        headers: {
          //Accept: "application/fhir+json", 
          Authorization: `Bearer ${access_token}`,
          // Add other headers if needed
        },
      };
      // Make the fetch API call
   
        fetch(covApiUrl, fetchOptions)
          .then(response => {
            // Handle the response
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json(); // or response.text() for non-JSON responses
          })
          .then(data => {
            // Process the data
            coverageDetails = data;
			console.log("coverageDetails from epic : ",coverageDetails);
            sessionStorage.setItem('coverageDetails', JSON.stringify(data));
 
          })
          .catch(error => {
            // Handle errors
            console.error("Error:", error);
          })
          .finally(() => {
            coverageDetails = JSON.parse(sessionStorage.getItem('coverageDetails'));
          });
 
      var prac = smart.patient.api.fetchAll({
        type: "Practitioner",
      });
 
      prac.done(function (data) { sessionStorage.setItem('practitionerDetails', JSON.stringify(data)); });
 
      //cerner
 
      // // Specify the base URL
      // const pracBaseUrl =  `https://${host}/r4/${instance}/Practitioner`;
 
      // // Specify query parameters
      // //const patientId = "12724069";
      // const pracId = 12732065; // implement a method to fetch practitioner Id from Encounter details from session storage
      // // Construct the URL with query parameters
      // const pracApiUrl = `${pracBaseUrl}/${pracId}`;
      // var practitionerDetails;
 
      // // Make the fetch API call
      // fetch(covApiUrl, fetchOptions)
      //   .then(response => {
      //     // Handle the response
      //     if (!response.ok) {
      //       throw new Error(`HTTP error! Status: ${response.status}`);
      //     }
      //     return response.json(); // or response.text() for non-JSON responses
      //   })
      //   .then(data => {
      //     // Process the data
      //     console.log("prac data", data);
      //     practitionerDetails = data;
      //     sessionStorage.setItem('practitionerDetails', JSON.stringify(data));
 
      //   })
      //   .catch(error => {
      //     // Handle errors
      //     console.error("Error:", error);
      //   })
 
      var org = smart.patient.api.fetchAll({
        type: "Organization",
      });
 
      org.done(function (data) { sessionStorage.setItem('orgDetails', JSON.stringify(data)); });
 
      var enc = smart.patient.api.fetchAll({
        type: "Encounter",
      });
 
      // here, we are getting here first index of encounter Details array.
 
      enc.done(function (data) { sessionStorage.setItem('encounterDetails', JSON.stringify(data[0])); });
 
      console.log("111");
      var docRef = smart.patient.api.fetchAll({
        type: "DocumentReference",
      });
      console.log("222");
 
      docRef.done(function (data) { sessionStorage.setItem('DocumentReference', JSON.stringify(data));});
      console.log("333");
      console.log("docRef:",docRef.done(function(data){console.log(data)}));
 
 
      // $.when(pt, enc).done(function (patient, enc) {
      //   var enc1 = enc[0];
      //   enc1.done(function (data) { sessionStorage.setItem('encounterDetails', JSON.stringify(data)); });
      // });
 
 
 
 
      // var covorg = smart.cov.api.fetchAll({
      //   type: "Organization",
      // });
 
      // covorg.done(function (data) { sessionStorage.setItem('covOrgDetails', JSON.stringify(data)); });
 
      var insuranceOrg = "";
 
      $.when(pt, obv).fail(onError);
 
      $.when(pt, cov).done(function (patient, cov) {
        var coverageArray = [];
        var coverageIndex = 0;
        for (var i = 0; i < cov.length; i++) {
          var coverageItem = cov[i];
          if (
            coverageItem.hasOwnProperty("period") &&
            coverageItem.hasOwnProperty("payor") &&
            coverageItem.status == "active"
          ) {
            coverageArray[coverageIndex] = {
              id: coverageItem.id,
              payorId: coverageItem.payor[0].reference,
              startDate: coverageItem.period.start,
              endDate: coverageItem.period.end,
            };
            coverageIndex = coverageIndex + 1;
          }
        }
        var insuranceDetail = coverageArray[0];
        insuranceOrg = "";
        insuranceOrg = insuranceDetail.payorId.split("/")[1];
        var insurance =
          "<b>From: </b>" +
          insuranceDetail.startDate +
          "  <b>To: </b>" +
          insuranceDetail.endDate;
        document.getElementById("planEffective").innerHTML = insurance;
 
        $.when(insuranceOrg, org).done(function (insuranceOrg, org) {
          var orgDetails = org.find((o) => o.id === insuranceOrg);
          document.getElementById("primaryPayer").innerHTML = orgDetails.name;
        });
      });
 
      $.when(pt, obv).done(function (patient, obv) {
        var byCodes = smart.byCodes(obv, "code");
        var gender = patient.gender;
        //console.log("PATIENT DATA", patient);
        var fname = "";
        var lname = "";
 
        var patient_id = patient.id;

        console.log("Patient Details:", patient);
        console.log("Patient ID:", patient_id);
        console.log("Patient dot ID:", patient.id);
 
        if (typeof patient.name[0] !== "undefined") {
          fname = patient.name[0].given.join(" ");
          lname = patient.name[0].family;
        }
 
        var height = byCodes("8302-2");
 
        var hdl = byCodes("2085-9");
        var ldl = byCodes("2089-1");
 
        document.getElementById("patient_id").innerHTML = patient.id;
        document.getElementById("fname").innerHTML = fname + " " + lname;
 
        document.getElementById("gender").innerHTML = gender;
        document.getElementById("birthdate").innerHTML = patient.birthDate;
 
        ret.resolve();
      });
    } else {
      onError();
    }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
