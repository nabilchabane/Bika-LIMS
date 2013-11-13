*** Settings ***

Library                 Selenium2Library  timeout=10  implicit_wait=0.2
Resource                keywords.txt
Suite Setup             Start browser
Suite Teardown          Close All Browsers

*** Variables ***

${SELENIUM_SPEED}  0
${PLONEURL}        http://localhost:55001/plone

*** Test Cases ***

Test AR specs UI
    Log in                      test_labmanager                 test_labmanager

    # enable ar spec fields
    go to                       ${PLONEURL}/bika_setup/edit
    click link                  Analyses
    select checkbox             EnableARSpecs

    # add ar
    go to                       ${PLONEURL}/clients/client-1/analysisrequests
    click link                  Add
    wait until page contains    Request new analyses
    Select from dropdown        ar_0_Contact                    Rita             1
    Select from dropdown        ar_0_Profile                    Trace            1
    SelectDate                  ar_0_SamplingDate               1
    Select from dropdown        ar_0_SampleType                 Apple Pulp
    Select from dropdown        ar_0_Specification              Apple Pulp
    # spot check that specs are set to default
    Textfield Value Should Be   css=input[class*='min'][keyword='Ca']            9
    Textfield Value Should Be   css=input[class*='max'][keyword='Ca']            11
    Textfield Value Should Be   css=input[class*='error'][keyword='Ca']          10
    # mod the spec for calcium
    Input text                  css=input[class*='min'][keyword='Ca']            1
    Input text                  css=input[class*='max'][keyword='Ca']            5
    Input text                  css=input[class*='error'][keyword='Ca']          10
    Set Selenium Timeout        30
    Click Button                Save
    Wait until page contains    created
    Set Selenium Timeout        10

    Select Checkbox             css=[item_title='AP-0001-R01']
    Click element               css=[transition='receive']
    Wait until page contains    saved

    Click link                          css=[href*='AP-0001-R01']
    wait until page contains element    css=[selector='Result_Ca']

    Input text                          css=[selector='Result_Ca']      7
    Press Key                           css=[selector='Result_Ca']      \t
    Page Should contain element         css=[title='Result out of range (min 1, max 5)']
    Input text                          css=[selector='Result_Ca']      4
    Press Key                           css=[selector='Result_Ca']      \t
    Page Should not contain element     css=[title*='Result out of range']

    Input text                          css=[selector='Result_Cu']      12
    Press Key                           css=[selector='Result_Cu']      \t
    Page Should contain element         css=[title='Result out of range (min 9, max 11)']
    Input text                          css=[selector='Result_Cu']      10
    Press Key                           css=[selector='Result_Cu']      \t
    Page Should not contain element     css=[title*='Result out of range']

*** Keywords ***

Start browser
    Open browser                http://localhost:55001/plone/login
    Set selenium speed          0
