// Curated high-impact Salesforce interview talking points for last-minute revision.
window.INTERVIEW_TALKING_POINTS = [
  {
    id: "order-of-execution",
    patterns: [/order.of.execution/i],
    title: "Order of Execution",
    question: "Walk me through the Salesforce Order of Execution when a record is saved.",
    answer30s: "System validation -> Before triggers -> Custom validation rules -> After triggers -> Assignment / Auto-response / Workflow rules -> Before-save & After-save Flows -> Escalation & Entitlements -> Roll-up summaries -> Commit DML -> Post-commit logic & async Apex.",
    example: "Default fields and simple sanitization belong in Before triggers to avoid redundant DMLs. Cross-object operations or child creation belong in After triggers or Async Apex.",
    followUp: "If a workflow rule or after-save flow updates the same record, Before and After triggers fire a second time (recursion).",
    gotcha: "Custom validation rules do NOT run before Before triggers! System validation runs first, then Before triggers run, and ONLY THEN do custom validation rules execute."
  },
  {
    id: "async-apex-comparison",
    patterns: [/async_apex|futurevsqueueable|async_callable|future_methods|queueable_apex/i],
    title: "Future vs Queueable vs Batch Apex",
    question: "When would you choose Queueable Apex over Future methods and Batch Apex?",
    answer30s: "Use Queueable when you need complex types (sObjects/custom Apex types), sequential job chaining (`System.enqueueJob`), or job ID tracking. Use Future only for simple fire-and-forget callouts or mixed DML. Use Batch Apex for processing large volumes (>50,000 records).",
    example: "Calling an external shipping API when an order is paid and then queueing an invoice PDF generation job with returned tracking data.",
    followUp: "How do Transaction Finalizers improve Queueable error handling compared to Batch Apex `Database.RaisesPlatformEvents`?",
    gotcha: "You can only chain ONE queueable job from a running queueable in a standard execution, and calling a `@future` method from a batch or queueable context throws an AsyncException."
  },
  {
    id: "trigger-recursion",
    patterns: [/avoid_recursion|recursiontriggers/i],
    title: "Trigger Recursion Prevention",
    question: "How do you prevent trigger recursion without breaking bulk DML or multi-batch processing?",
    answer30s: "Use a static `Set<Id>` of record IDs currently being processed or already handled, instead of a single static `Boolean` flag. A static boolean flag breaks multi-batch operations because subsequent chunks of 200 records get skipped.",
    example: "When an After Update on Account updates Contacts, and a Contact trigger updates the parent Account, a set of processed Account IDs prevents an endless loop.",
    followUp: "How does an enterprise trigger framework (Handler / Service Layer pattern with bypass mechanisms) manage re-entrancy cleanly?",
    gotcha: "Setting a static `isExecuting = false` flag terminates recursion for records 1–200, but silences trigger logic completely for records 201–400 in the same bulk transaction."
  },
  {
    id: "governor-limits",
    patterns: [/governor_limits/i],
    title: "Governor Limits & Bulkification Architecture",
    question: "How do you design Apex to strictly respect governor limits in high-volume enterprise orgs?",
    answer30s: "Always bulkify methods to accept collections (`List<SObject>`). Zero SOQL queries or DML inside loops. Use Set-based filtering and Map indexing. Respect transaction boundaries (100 SOQL / 150 DML synchronous, 10s CPU limit).",
    example: "When inserting 200 Opportunities, query all Account credit limits in 1 SOQL using `WHERE Id IN :accountIds`, map them in memory, and execute 1 single `Database.update`.",
    followUp: "What is the difference between the 100 SOQL query limit and the 50,000 SOQL records retrieved limit, and how do SOQL `for` loops prevent heap overflow?",
    gotcha: "Formula fields evaluated during SOQL queries and automated processes (Flows/Workflows) executing behind the scenes consume governor limits from the same transaction."
  },
  {
    id: "lwc-wire-vs-imperative",
    patterns: [/wirevsimperative|@wirevsimplicit|fetch_data_lwc/i],
    title: "LWC: @wire vs Imperative Apex",
    question: "When do you use `@wire` versus Imperative Apex in Lightning Web Components?",
    answer30s: "Use `@wire` for read-only data fetch where client-side caching, automated provisioning, and reactivity to parameter changes are desired (`@AuraEnabled(cacheable=true)`). Use Imperative Apex for DML operations, user-triggered events (button click), or passing complex parameters.",
    example: "Wire an Account detail card to reactive `$recordId`. Use Imperative Apex inside `handleApprove()` to call backend discount approval logic.",
    followUp: "How do you invalidate and refresh wired data after an imperative update? (`refreshApex(wiredProperty)` or `notifyRecordUpdateAvailable`).",
    gotcha: "Methods annotated with `cacheable=true` CANNOT perform DML. Attempting DML inside a wired method triggers a runtime DML exception."
  },
  {
    id: "lightning-data-service",
    patterns: [/\blds\b/i],
    title: "Lightning Data Service (LDS) Architecture",
    question: "What are the architectural advantages of using Lightning Data Service over custom Apex?",
    answer30s: "LDS provides unified client-side caching across all components on a page, enforces OWD, FLS, and sharing rules automatically, and eliminates the need for Apex controllers. If one component modifies a record, all other components on the page re-render seamlessly.",
    example: "Using `lightning-record-form` or `getRecord` wire adapter for standard CRUD instead of writing custom Apex controllers.",
    followUp: "When is LDS insufficient? Complex multi-object transactional joins, aggregate calculations, or validation requiring custom external services.",
    gotcha: "LDS operates exclusively on single records; it cannot perform bulk record queries or transactional multi-object saves."
  },
  {
    id: "lwc-lifecycle-hooks",
    patterns: [/lwc_lifecycle/i],
    title: "LWC Component Lifecycle",
    question: "Walk through the LWC lifecycle hooks in execution order and what logic belongs in each.",
    answer30s: "`constructor()` -> `connectedCallback()` -> `renderedCallback()` -> `disconnectedCallback()` -> `errorCallback()`. Never access DOM or child components in `constructor()`. Initialize subscriptions and state in `connectedCallback()`. Perform guarded DOM manipulations in `renderedCallback()`.",
    example: "Subscribe to a Lightning Message Service (LMS) channel in `connectedCallback()` and unsubscribe in `disconnectedCallback()` to prevent memory leaks.",
    followUp: "Why must changes to reactive properties in `renderedCallback()` be guarded with a boolean flag?",
    gotcha: "Mutating any reactive property inside `renderedCallback()` without an exit guard triggers another render cycle, causing an infinite browser recursion loop."
  },
  {
    id: "security-sharing-owd",
    patterns: [/sfdc_security_model|\bowd\b|profile_vs_permissionset/i],
    title: "Salesforce Security & Sharing Architecture",
    question: "Explain how OWD, Role Hierarchy, Sharing Rules, and Manual Sharing work together.",
    answer30s: "OWD sets the baseline security (Private, Public Read Only, Public Read/Write). Role Hierarchy opens record access vertically up the management tree. Sharing Rules open access horizontally based on criteria or ownership. Manual Sharing grants ad-hoc access. Sharing can only OPEN access, never restrict below OWD.",
    example: "Opportunities OWD is Private. Sales reps own their deals; a Sharing Rule shares 'Enterprise' deals with Sales Ops; VP sees all deals via Role Hierarchy.",
    followUp: "How does 'View All Data' or 'Modify All' at the Profile/Permission Set level affect sharing rules? (It completely bypasses all sharing logic).",
    gotcha: "Grant Access Using Hierarchies cannot be disabled for standard Salesforce objects; it can only be toggled off for custom objects."
  },
  {
    id: "apex-security-enforcement",
    patterns: [/ols_fls_in_apex|sharing_records_via_apex/i],
    title: "Modern Apex Security: user_mode vs system_mode",
    question: "How do you enforce CRUD, FLS, and Sharing in modern Apex?",
    answer30s: "Use `WITH USER_MODE` in SOQL queries and `as user` in DML statements. Alternatively use `Security.stripInaccessible()` for sanitized payload updates. In class headers, declare `with sharing` to enforce record sharing.",
    example: "`[SELECT Id, Salary__c FROM Employee__c WITH USER_MODE]` automatically throws `SecurityException` if the user lacks Field-Level Security for `Salary__c`.",
    followUp: "What is the difference between `with sharing`, `without sharing`, and `inherited sharing`?",
    gotcha: "`with sharing` enforces RECORD-level sharing rules, but does NOT enforce CRUD or FLS by default! FLS requires `WITH USER_MODE` or `Security.stripInaccessible()`."
  },
  {
    id: "flows-vs-triggers",
    patterns: [/flows_vs.*triggers|flow_elements/i],
    title: "Flows vs Apex Triggers Decision Framework",
    question: "When should you build a Record-Triggered Flow versus writing an Apex Trigger?",
    answer30s: "Use Record-Triggered Flows for standard field updates, email notifications, simple task creation, and declarative business requirements that non-developers maintain. Use Apex Triggers for high-volume transactions (>50k records), complex mathematical algorithms, external web service callouts, or granular error handling.",
    example: "Use Before-Save Flow for fast field defaulting on Lead creation. Use an Apex Trigger for cross-object duplicate prevention requiring complex string distance algorithms.",
    followUp: "How does Before-Save Flow performance compare to Apex? (Before-Save Flows update fields on the same record in memory before commit, running near parity with Apex Before triggers).",
    gotcha: "Building both a Flow and an Apex Trigger on the same object without a designated sequence strategy causes unpredictable race conditions and double executions."
  },
  {
    id: "named-credentials",
    patterns: [/extvsnamedcredvsconnectedapp|http_callout/i],
    title: "Named Credentials vs Connected Apps vs External Credentials",
    question: "Compare Named Credentials, External Credentials, and Connected Apps in Salesforce integrations.",
    answer30s: "Named Credentials specify callout endpoint URLs and authentication configurations without hardcoding secrets in Apex. External Credentials handle the protocol (OAuth 2.0, AWS Signature, Basic) and map permission sets to principals. Connected Apps are for INBOUND authentication where an external system logs into Salesforce.",
    example: "External ERP logs into Salesforce via Connected App with OAuth JWT Bearer. Outbound callout from Apex to Stripe uses Named Credential `callout:Stripe_Gateway/v1/charges`.",
    followUp: "Why were legacy Named Credentials decoupled into Named Credentials + External Credentials? (To allow multiple permission sets/principals on a single endpoint).",
    gotcha: "Hardcoding API secrets in Custom Metadata or Custom Settings violates security audits; Named Credentials securely store credentials and manage token renewal automatically."
  },
  {
    id: "batch-apex-testing",
    patterns: [/batch_apex_testing|\bbatch apex\b/i],
    title: "Batch Apex Execution & Test Class Boundaries",
    question: "How does transaction execution differ between production and test execution for Batch Apex?",
    answer30s: "In production, Batch Apex executes asynchronously in chunks (default 200 records per chunk). In test methods between `Test.startTest()` and `Test.stopTest()`, Salesforce executes ONLY ONE chunk synchronously so that governor limits can be evaluated.",
    example: "When testing a batch class with 400 records, only the first batch of 200 records is executed in the test run.",
    followUp: "What is `Database.Stateful` and why should it be used sparingly? (It preserves instance state across chunks, requiring serialization to database between batches).",
    gotcha: "Creating 500 test records and expecting all 500 to be updated in a test method will fail your assertions because only 1 chunk runs between startTest and stopTest."
  },
  {
    id: "master-detail-vs-lookup",
    patterns: [/masterdetail and lookup/i],
    title: "Master-Detail vs Lookup Relationships",
    question: "What are the fundamental architectural differences between Master-Detail and Lookup relationships?",
    answer30s: "Master-Detail enforces cascade delete, child records inherit security/ownership from master, master can have Roll-Up Summary fields, and the child's relationship field is mandatory. Lookup is loose coupling: independent ownership, optional cascade delete, and no native roll-ups (without declarative tools/Apex).",
    example: "Invoice (Master) and Invoice Line Items (Detail) — deleting an invoice must delete its line items, and total amount rolls up to master.",
    followUp: "What are the limits on Master-Detail relationships per custom object (2) and roll-up summary fields (up to 40 per object)?",
    gotcha: "You cannot create a Master-Detail relationship on an existing object with records unless you first create it as a Lookup, populate all records, and then convert it."
  },
  {
    id: "dynamic-soql",
    patterns: [/dynamic soql/i],
    title: "Dynamic SOQL & SOQL Injection Defense",
    question: "What is SOQL injection and how do you prevent it in dynamic queries?",
    answer30s: "SOQL injection occurs when untrusted user input is concatenated directly into a query string (`Database.query()`). Prevent it by using bind variables (`:variableName`) which are inherently sanitized, or `String.escapeSingleQuotes()` when bind variables cannot be used.",
    example: "`String q = 'SELECT Id FROM Contact WHERE LastName = :userInput'; Database.query(q);` is safe. Concatenating `'WHERE LastName = \'' + userInput + '\''` allows `' OR LastName != null'` attacks.",
    followUp: "Can bind variables be used for dynamic `ORDER BY` or `LIMIT` clauses? (No, those require sanitized string concatenation).",
    gotcha: "`String.escapeSingleQuotes()` does NOT protect against injection if the input is numeric or boolean and concatenated without quotes!"
  },
  {
    id: "approval-processes",
    patterns: [/approvalprocess/i],
    title: "Salesforce Approval Processes vs Custom Automation",
    question: "When do you configure standard Approval Processes instead of building with Flow or Apex?",
    answer30s: "Use standard Approval Processes when you need formal multi-step sign-offs, email/mobile push approval actions, auto-locking of records, and delegate approver hierarchies out of the box. Use Flow/Apex when dynamic branching requires conditional loops not supported by the linear approval wizard.",
    example: "Discount approval: >10% requires Manager approval; >25% requires VP approval; record is locked during review.",
    followUp: "How can Apex interact with approval processes programmatically? (`Approval.ProcessSubmitRequest` / `Approval.process()`).",
    gotcha: "Standard approval processes cannot be triggered easily for child records in bulk without careful Apex triggers handling bulk submit requests."
  },
  {
    id: "test-boundaries",
    patterns: [/test.startvstest.execute/i],
    title: "Apex Test Class Governor Reset Boundaries",
    question: "What is the exact purpose of `Test.startTest()` and `Test.stopTest()`?",
    answer30s: "`Test.startTest()` creates a brand new set of governor limits for the code under test, separating test data setup limits from actual execution limits. `Test.stopTest()` forces all asynchronous processes (Future, Queueable, Batch) launched within the block to execute synchronously before proceeding to assertions.",
    example: "Inserting 200 Accounts consumes SOQL and DML. Calling `Test.startTest()` gives the actual business method a fresh 100 SOQL / 150 DML limit budget.",
    followUp: "Can you call `Test.startTest()` more than once in a test method? (No, multiple calls throw a TestException).",
    gotcha: "Assertions placed BEFORE `Test.stopTest()` for asynchronous code will fail because the async jobs have not finished executing yet."
  }
];
