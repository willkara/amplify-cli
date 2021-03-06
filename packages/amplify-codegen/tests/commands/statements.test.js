const path = require('path');
const { default: generate } = require('amplify-graphql-docs-generator');
const fs = require('fs-extra');

const loadConfig = require('../../src/codegen-config');
const generateStatements = require('../../src/commands/statements');
const constants = require('../../src/constants');
const {
  downloadIntrospectionSchemaWithProgress,
  getFrontEndHandler,
  getAppSyncAPIDetails,
} = require('../../src/utils');


const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
  },
  amplify: {
    getEnvInfo: jest.fn(),
  },
};

jest.mock('amplify-graphql-docs-generator');
jest.mock('../../src/codegen-config');
jest.mock('../../src/utils');
jest.mock('fs-extra');

const MOCK_INCLUDE_PATH = 'MOCK_INCLUDE';
const MOCK_STATEMENTS_PATH = 'MOCK_STATEMENTS_PATH';
const MOCK_SCHEMA = 'INTROSPECTION_SCHEMA.JSON';
const MOCK_TARGET_LANGUAGE = 'TYPE_SCRIPT_OR_FLOW_OR_ANY_OTHER_LANGUAGE';
const MOCK_GENERATED_FILE_NAME = 'API.TS';
const MOCK_API_ID = 'MOCK_API_ID';
const MOCK_REGION = 'MOCK_AWS_REGION';
const MOCK_PROJECT_ROOT = 'MOCK_PROJECT_ROOT';

const MOCK_APIS = [
  {
    id: MOCK_API_ID,
  },
];
const MOCK_PROJECT = {
  includes: [MOCK_INCLUDE_PATH],
  schema: MOCK_SCHEMA,
  amplifyExtension: {
    generatedFileName: MOCK_GENERATED_FILE_NAME,
    codeGenTarget: MOCK_TARGET_LANGUAGE,
    graphQLApiId: MOCK_API_ID,
    docsFilePath: MOCK_STATEMENTS_PATH,
    region: MOCK_REGION,
  },
};

getFrontEndHandler.mockReturnValue('javascript');

describe('command - statements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    getFrontEndHandler.mockReturnValue('javascript');
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([MOCK_PROJECT]),
    });
    MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
    getAppSyncAPIDetails.mockReturnValue(MOCK_APIS);
  });

  it('should generate statements', async () => {
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(getFrontEndHandler).toHaveBeenCalledWith(MOCK_CONTEXT);
    expect(loadConfig).toHaveBeenCalledWith(MOCK_CONTEXT);

    expect(fs.existsSync).toHaveBeenCalledWith(path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA));
    expect(generate).toHaveBeenCalledWith(
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      path.join(MOCK_PROJECT_ROOT, MOCK_STATEMENTS_PATH),
      { separateFiles: true, language: MOCK_TARGET_LANGUAGE },
    );
  });

  it('should generate graphql statements for non JS projects', async () => {
    getFrontEndHandler.mockReturnValue('ios');
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(generate).toHaveBeenCalledWith(
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      path.join(MOCK_PROJECT_ROOT, MOCK_STATEMENTS_PATH),
      { separateFiles: true, language: 'graphql' },
    );
  });

  it('should download the schema if forceDownload flag is passed', async () => {
    const forceDownload = true;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(downloadIntrospectionSchemaWithProgress).toHaveBeenCalledWith(
      MOCK_CONTEXT,
      MOCK_API_ID,
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      MOCK_REGION,
    );
  });

  it('should download the schema if the schema file is missing', async () => {
    fs.existsSync.mockReturnValue(false);
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(downloadIntrospectionSchemaWithProgress).toHaveBeenCalledWith(
      MOCK_CONTEXT,
      MOCK_API_ID,
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      MOCK_REGION,
    );
  });

  it('should show a warning if there are no projects configured', async () => {
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([]),
    });
    await generateStatements(MOCK_CONTEXT, false);
    expect(MOCK_CONTEXT.print.info).toHaveBeenCalledWith(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
  });
});
