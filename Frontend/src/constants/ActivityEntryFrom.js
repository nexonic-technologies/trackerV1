const ActivityEntryFrom = [
  {
    label: "Client",
    name: "clientName",
    type: "AutoComplete",
    source: "/populate/read/clients",
    placeholder: "Select Client",
    required: true,
  },
  {
    label: "Project Type",
    name: "projectType",
    type: "AutoComplete",
    source: "/populate/read/clients/:clientId?fields=projectTypes&populateFields=projectTypes",
    placeholder: "Select Project Type",
    dependsOn: "clientName",
    required: true,
  },
  {
    type: "multiGroup",
    name: "activities",
    label: "Activities",
    fields: [
      {
        type: "AutoComplete",
        name: "taskType",
        label: "Task Type",
        source: "/populate/read/tasktypes",
      },
      {
        type: "textarea",
        name: "activity",
        label: "Activity Description",
      },
    ],
  },
];

export default ActivityEntryFrom;
