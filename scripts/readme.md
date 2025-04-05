Scripts to update the data by querying the audit database on AWS

Secrets required to run these endpoints are in the private repo readme: <a href="https://github.com/ScanGov/auditor?tab=readme-ov-file#getting-all-the-data-for-homepages">ScanGov auditor</a>

Once you have the required environment variable you can run:

To update the accessibility json file:

```
node update-accessibility.js
node update-performance.js
```