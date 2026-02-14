import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/datastack-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "api/get-a-user",
          label: "Get a user",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
