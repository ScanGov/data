import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

let existingPerformance = JSON.parse(fs.readFileSync(`../performance.json`));
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
existingPerformance.forEach(e => {
  if(e && e.url) {
  } else {
    console.log(e)
  }
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

dbData.records.Items.forEach(r => {
  let find = existingMap.get(r.primaryKeyDomain);
  let performanceInfo = JSON.parse(r.auditData).performance;
  if(performanceInfo) {
    if(find) {
      let historyObj = {};
      historyObj.time = 1742022000000;
      historyObj.status = 200;
      for(var a in performanceInfo.attributes) {
        historyObj[a] = find[a];
        find[a] = performanceInfo.attributes[a];
      }
      find.history.push(historyObj);
      find.time = r.auditedTime;
      delete find.datafile;
      existingMap.set(r.primaryKeyDomain,find);
    } else {
      let newObj = {};
      newObj.url = r.primaryKeyDomain;
      newObj.origin = r.url;
      for(var a in performanceInfo.attributes) {
        newObj[a] = performanceInfo.attributes[a];
      }
      newObj.name = allDomainsMap.get(r.primaryKeyDomain);
      newObj.history = [];
      newObj.status = 200;
      if(newObj.name) {
        existingMap.set(r.primaryKeyDomain,newObj);
        // don't add anything not in domains.csv or it breaks scangov build
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
fs.writeFileSync('../performance.json',JSON.stringify(output),'utf8');