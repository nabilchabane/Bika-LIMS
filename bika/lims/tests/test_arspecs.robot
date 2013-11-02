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
    Log in                      test_labmanager  test_labmanager

    go to                       ${PLONEURL}/clients/client-1/analysisrequests
    click link                  Add
    wait until page contains    Request new analyses
    Select from dropdown        ar_0_Contact    Rita
    SelectDate                  ar_0_SamplingDate            1
    Select from dropdown        ar_0_SampleType    Water
    Click element               css=#cat_lab_Metals

    Select checkbox             xpath=//input[@title='Calcium'][1]

    #

    Select checkbox             xpath=//input[@title='Magnesium'][1]

    Set Selenium Timeout        30
    Click Button                Save
    Wait until page contains    created
    Set Selenium Timeout        10

    go to                       ${PLONEURL}/bika_setup/edit
    click link                  Analyses
    select checkbox             EnableARSpecs

    go to                       ${PLONEURL}/bika_setup/edit
    click link                  Analyses
    select checkbox             EnableARSpecs



*** Keywords ***

Start browser
    Open browser                http://localhost:55001/plone/login
    Set selenium speed          0
