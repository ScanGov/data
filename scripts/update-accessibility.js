import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

let existingAccessibility = JSON.parse(fs.readFileSync(`../accessibility.json`));
let allDomainsCsv = fs.readFileSync(`../domains.csv`);

let allDomainsMap = new Map();
const allDomainsArr = parse(allDomainsCsv, {
  columns: true,
  skip_empty_lines: true
});
allDomainsArr.forEach(d => {
  allDomainsMap.set(d.domain,d.agency);
})

let existingMap = new Map();
existingAccessibility.forEach(e => {
  existingMap.set(e.url,e);
})

let dbData;

try {
  // get this with a fetch using the env variable
  const response = await fetch(`https://y10vxe2xw2.execute-api.us-west-2.amazonaws.com/all?homepages=true&time=1743541534709&hash=${process.env.scangovhash}`);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  const json = await response.json();
  dbData = json;
} catch (error) {
  console.error(error.message);
}

// couldn't match these, they need to be fixed or added to domains.csv
let additionalDomains = {
  'nsf.gov': 'National Science Foundation',
  'response.epa.gov': 'Environmental Protection Agency',
  'namus.nij.ojp.gov': 'National Missing and Unidentified Persons System',
  'research.fs.usda.gov': 'United States Department of Agriculture',
  'tuscaloosa.com': 'City of Tuscaloosa, AL',
  'cityofmesquite.com': 'City of Mesquite, TX',
  'cityofpasadena.net': 'City of Pasadena, CA',
  'visalia.city': 'City of Visalia, CA',
  'cityofsparks.us': 'City of Sparks, NV',
  'sbcity.org': 'City of San Bernadino, CA',
  'chico.ca.us': 'City of Chico, CA',
  'dallascityhall.com': 'City of Dallas, TX',
  'cityofwarren.org': 'City of Warren, MI',
  'deadiversion.usdoj.gov': 'Drug Enforcement Administration'
}

dbData.records.Items.forEach(r => {
  let find = existingMap.get(r.primaryKeyDomain);
  let accessibilityInfo = JSON.parse(r.auditData).accessibility;
  if(accessibilityInfo) {
    if(find) {
      let historyObj = {};
      historyObj.time = 1742022000000;
      historyObj.status = 200;
      for(var a in accessibilityInfo.attributes) {
        historyObj[a] = find[a];
        find[a] = accessibilityInfo.attributes[a];
      }
      find.history.push(historyObj);
      find.time = r.auditedTime;
      delete find.datafile;
      delete find.remediation;
      existingMap.set(r.primaryKeyDomain,find);
    } else {
      let newObj = {};
      newObj.url = r.primaryKeyDomain;
      for(var a in accessibilityInfo.attributes) {
        newObj[a] = accessibilityInfo.attributes[a];
      }
      newObj.name = allDomainsMap.get(r.primaryKeyDomain);
      if(!allDomainsMap.get(r.primaryKeyDomain)) {
        newObj.name = additionalDomains[r.primaryKeyDomain];
      }
      newObj.history = [];
      newObj.status = 200;
      if(newObj.name) {
        existingMap.set(r.primaryKeyDomain,find);
      }
    }
  } else {
    // tried to audit this page but it failed so have no new data
  }  
})

let output = [];
existingMap.forEach(item => {
  output.push(item);
})
fs.writeFileSync('../accessibility.json',JSON.stringify(output),'utf8');