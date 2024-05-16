import { Box, Typography, styled, Button, FormControl } from '@mui/material';
import { useState, useEffect, useMemo } from "react";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DataTable from "react-data-table-component";
import Papa from "papaparse";
import { DetectSentimentCommand } from "@aws-sdk/client-comprehend";
import { comprehendClient} from "../libs/comprehend"
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import { red, green, blue, grey } from '@mui/material/colors';
import TextField from '@mui/material/TextField';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GaugeChart from 'react-gauge-chart';
import CircleIcon from '@mui/icons-material/Circle';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const PER_PAGE_ITEM = 10;

const MainPage = () => {
  const [newCSVFile, setCSVFile] = useState();
  const [activePage, setActivePage]= useState(0)
  const [perPageCount, setPerPageCount] = useState(PER_PAGE_ITEM)
  const [tableData, setTableData] = useState([]);
  const [pending, setPending] = useState(false);
  const [isClick, setIsClick] = useState(false)
  const [identityPoolId, setIdentityPoolId] = useState("")
  const [calculatedSentiment, setCalculatedSentiment] = useState({ "page1" : 0})
  const [generatedSentimental, setGeneratedSentimental] = useState({
    1: false
  });
  const hasError = useMemo(() => !identityPoolId && isClick ? true : false, [identityPoolId, isClick]);
  const getHelperText = useMemo(
    () => (!identityPoolId && isClick ? "Pool Key cannot be blank" : ""),
    [identityPoolId, isClick]
  );
  const compareTime = (dateString, now) => {
   if (now - dateString < 86400000) {
     return false
   }
   return true 
  }
  const checkForModal = () => {
    const object = JSON.parse(localStorage.getItem("poolKey"));
    let openModal = true;
    if (object && object?.value) {
      const dateString = object.timestamp;
      const now = new Date().getTime();
      if (!compareTime(dateString, now)) {
        openModal = false
      }
    }
    if (!openModal) {
      setIdentityPoolId(object.value);
    } 
    // eslint-disable-next-line
    console.log("env >", window?.process?.env, process?.env)
    // else if (process?.env?.REACT_APP_AWS_POOL_KEY){
    //   setIdentityPoolId(process.env.REACT_APP_AWS_POOL_KEY)
    // }
  }
  useEffect(() => {
    checkForModal()
  }, [])
  
  const columns = [
    {
      maxWidth: "220px",
      name: "Sentimental",
      selector: (row) => {
        if (row?.sentimental) {
          return (
            <>
              <span style={{ color : row?.sentimental?.Color}}>{row?.sentimental?.Final}</span>
              {/*<span style={{ color : green[800]}}>{row?.sentimental?.Positive + "% "}</span>
              <span style={{ color : blue[800]}}>{row?.sentimental?.Neutral + "% "}</span>
              <span style={{ color : red[800]}}>{row?.sentimental?.Negative + "% "}</span>
              <span style={{ color : grey[800]}}>{row?.sentimental?.Mixed + "% "}</span>
              */}
            </>
            )
        } else {
          return "-"
        }
      },
    },
    {
      name: "Feed",
      selector: (row) => row?.feed || "",
    },
  ];
  
  const getCsvDetails = () => {
    try {
      if (newCSVFile) {
        Papa.parse(newCSVFile, {
          // header: true,
          skipEmptyLines: true,
          complete: function(results) {
            if (results?.data?.length > 1) {
              const skipOneRowFromArray = results?.data;
              skipOneRowFromArray.shift()
              const filterData = skipOneRowFromArray?.map((item) => {return({"feed" : item[0]})})
              setTableData(filterData);
              setActivePage(1)
              if (filterData.length < PER_PAGE_ITEM) {
                setPerPageCount(filterData.length)
              }
              setCalculatedSentiment({ "page1": 0 })
              setGeneratedSentimental({ 1 : false })
            }
          }}
        )
      }
    } catch (err) {
      console.log("Error", err);
    }
  };
  
  const countPositveGraph = (percentage) => {
    return (percentage/perPageCount) * 0.33;
  }
  const countNegativeGraph = (percentage) => {
    return ((percentage/perPageCount) * 0.33) + 0.67;
  }
  const countMixedGraph = (percentage) => {
    return ((percentage/perPageCount) * 0.33) + 0.34;
  }
  const getAnalyse = async () => {
    if (activePage) {
      setPending(true);
      const modifiedTableData = [...tableData];
      let postiveCount = 0;
      let postivePercentage = 0;
      let negativeCount = 0;
      let negativePercentage = 0;
      let mixedCount = 0;
      let mixedPercentage = 0;
      for (let i = (activePage-1)*PER_PAGE_ITEM; i < (activePage*PER_PAGE_ITEM); i++) {
        if (tableData?.[i]?.['feed'] && identityPoolId) {
          const input = { // DetectSentimentRequest
            Text: tableData[i]['feed'], // required
            LanguageCode: "en" || "es" || "fr" || "de" || "it" || "pt" || "ar" || "hi" || "ja" || "ko" || "zh" || "zh-TW", // required
          };
          const command = new DetectSentimentCommand(input);
          try {
            const data = await comprehendClient(identityPoolId).send(command);
            if (data?.SentimentScore) {
              let finalString = {}
              if (data?.SentimentScore?.Negative) {
                finalString['Negative'] = data?.SentimentScore?.Negative;
                // finalString += `Ne- ${(data?.SentimentScore?.Negative*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Neutral) {
                finalString['Neutral'] = data?.SentimentScore?.Neutral;
                // finalString += `, Nu- ${(data?.SentimentScore?.Neutral*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Positive) {
                finalString['Positive'] = data?.SentimentScore?.Positive;
                // finalString += `Po- ${(data?.SentimentScore?.Positive*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Mixed) {
                finalString['Mixed'] = data?.SentimentScore?.Mixed;
                // finalString += `Po- ${(data?.SentimentScore?.Positive*100).toFixed(2)} % `
              }
              finalString['Final'] = data?.Sentiment;
              modifiedTableData[i] = {...modifiedTableData[i], sentimental : finalString}
              const item = finalString;
              switch (item?.Final) {
                case 'POSITIVE':
                  postiveCount++;
                  finalString['Color'] = green[800]
                  postivePercentage += parseFloat(item['Positive']);
                  break;
                case 'NEGATIVE':
                  negativeCount++;
                  finalString['Color'] = red[800]
                  negativePercentage += parseFloat(item['Negative']);
                  break;
                case 'MIXED':
                  mixedCount++;
                  finalString['Color'] = blue[800]
                  mixedPercentage += parseFloat(item['Mixed']);
                  break;
                default:
                  finalString['Color'] = grey[800]
                  // code
              }
            }
          } catch (error) {
            
          }
        }
      }
      let finalPercentage = 0;
      console.log("check >", postiveCount, " ", postivePercentage ," ", negativeCount ," ", negativePercentage ," ", mixedCount ," ", mixedPercentage)
      if (postiveCount > negativeCount && postiveCount > mixedCount) {
        finalPercentage = countPositveGraph(postivePercentage);
      } else if (negativeCount > postiveCount && negativeCount > mixedCount) {
        finalPercentage = countNegativeGraph(negativePercentage);
      } else if (mixedCount > postiveCount && mixedCount > negativeCount) {
        finalPercentage = countMixedGraph(mixedPercentage);
      } else {
        if (postiveCount === negativeCount && negativeCount === mixedCount) {
          if (postivePercentage > negativePercentage && postivePercentage > mixedPercentage) {
            finalPercentage = countPositveGraph(postivePercentage);
          } else if(negativePercentage > postivePercentage && negativePercentage > mixedPercentage) {
            finalPercentage = countNegativeGraph(negativePercentage);
          } else {
            finalPercentage = countMixedGraph(mixedPercentage);
          }
        } else if (postiveCount === negativeCount) {
          if (postivePercentage > negativePercentage) {
            finalPercentage = countPositveGraph(postivePercentage);
          } else {
            finalPercentage = countNegativeGraph(negativePercentage);
          }
        } else if (postiveCount === mixedCount) {
          if (postivePercentage > mixedPercentage) {
            finalPercentage = countPositveGraph(postivePercentage);
          } else {
            finalPercentage = countMixedGraph(mixedPercentage);
          }
        } else if (negativeCount === mixedCount) {
          if (negativePercentage > mixedPercentage) {
            finalPercentage = countNegativeGraph(negativePercentage);
          } else {
            finalPercentage = countMixedGraph(mixedPercentage);
          }
        }
      }
      const finalSent = {...calculatedSentiment, [`page${activePage}`] : finalPercentage.toFixed(2)}
      console.log("finalPercentage >", finalSent)
      setCalculatedSentiment(finalSent)
      const generatedSentimentalDummy = {...generatedSentimental}
      generatedSentimentalDummy[activePage] = true
      setGeneratedSentimental(generatedSentimentalDummy)
      setTableData(modifiedTableData)
      setPending(false);
    }
  }
  const handlePageChange = (e) => {
    if (tableData.length >= e*PER_PAGE_ITEM) {
      setPerPageCount(PER_PAGE_ITEM)
    } else {
      setPerPageCount(tableData.length - ((e-1)*PER_PAGE_ITEM))
    }
    setActivePage(e)
  }
  const onDownload = () => {
    const link = document.createElement("a");
    link.download = "sample-csv-file.csv";
    link.href = "/files/sample-csv-file.csv";
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  };
  
  return(
      <div className="main">
          <div className="main_title_div">
              <Typography variant="h4" className="main_title">Twitter Feed Sentiment Analysis</Typography>
          </div>
          <Box component="section" sx={{ p: 2, border: '1px solid #f2f2f2'}}>
              <div className="upload_file_text">
                  <Typography level="body-md" sx={{ mb: 1, mt: 2 }}>Upload a CSV of Twitter Feeds that will be analyzed!</Typography>
                  <Box sx={{display : "flex" , flexDirection: 'row', mb: 3, alignItems : "center"}}>
                    <Button
                      component="label"
                      role={undefined}
                      variant="contained"
                      tabIndex={-1}
                      startIcon={<CloudUploadIcon />}
                      sx={{ mr: 3}}
                    >
                      Upload file
                      <VisuallyHiddenInput type="file" accept=".csv" onChange={({ target: { files } }) => {files[0] && setCSVFile(files[0]);}} />
                    </Button>
                    <Typography level="body-md">Selected CSV = {(newCSVFile && newCSVFile.name) || "No File Selected"}</Typography>
                  </Box>
                    <Button
                      variant="contained"
                      onClick={() => onDownload()}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      startIcon={<FileDownloadIcon />}
                      sx={{ mb : 3}}
                    >
                      Download Sample CSV File
                    </Button>
                  <Box sx={{ display : "flex" , flexDirection: 'row', alignItems : "center"}}>
                    <FormControl sx={{ width : "50%", mr: "3rem"}} variant="standard">
                      <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="name"
                        name="poolKey"
                        label="Enter Here Identity Pool Key"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={identityPoolId}
                        error={hasError}
                        helperText={getHelperText}
                        onChange={(e) => { setIdentityPoolId(e.target.value); setIsClick(e.target.value ? false : true);}}
                      />
                    </FormControl>
                    <Box>
                      <Button variant="contained" onClick={() => {
                        if (identityPoolId) {
                          var object = {value: identityPoolId, timestamp: new Date().getTime()}
                          localStorage.setItem("poolKey", JSON.stringify(object));
                          getCsvDetails()
                        } else {
                          setIsClick(true)
                        }
                      }}>Analyse CSV</Button>
                    </Box>
                  </Box>
              </div>
           </Box>
           <Box component="section" sx={{ p: 2, border: '1px solid #f2f2f2', mt:2}}>
              <Typography level="body-md" sx={{ mb: 1, mt: 0, mr: 3, display: 'inline'  }}>Choose the following button to start the proecess of sentiment analysis of current page.</Typography>
              {pending ?
                <LoadingButton
                  loading
                  loadingPosition="start"
                  startIcon={<SaveIcon />}
                  variant="outlined"
                  sx={{display: 'inline-flex' }}
                >
                  Check Sentimental
                </LoadingButton>
              :
                <Button sx={{display: 'inline' }}  disabled={generatedSentimental?.[activePage] === true} variant="contained" color="secondary" onClick={() => {getAnalyse()}}>Check Sentimental</Button>
              }
              <Box sx={{ mt: 2, display : 'flex', direction: 'columns'}}>
                <div style={{width: "20%", marginRight : '2rem'}}>
                  <GaugeChart id="gauge-chart5"
                    arcsLength={[0.33, 0.33, 0.33]}
                    colors={[green[800], blue[800], red[800]]}
                    percent={calculatedSentiment[`page${activePage}`] || 0}
                    // arcPadding={0.02}
                    hideText={true}
                  />
                </div>
                <Box>
                  <p style={{ margin: 0 }}><CircleIcon style={{height: "15px", color : green[800]}}/>Postive</p>
                  <p style={{ margin: 0 }}><CircleIcon style={{height: "15px", color : blue[800]}}/>Mixed</p>
                  <p style={{ margin: 0 }}><CircleIcon style={{height: "15px", color : red[800]}}/>Negative</p>
                </Box>
              </Box>
              <Typography level="h3" sx={{ mb: 1, mt: 3 }}>List of Files</Typography>
              <div style={{ width: '100%', 'overflow' : 'auto'}}>
              {tableData[0] ?
                  <DataTable
                    columns={columns}
                    data={tableData}
                    highlightOnHover
                    pointerOnHover
                    paginationPerPage={PER_PAGE_ITEM}
                    pagination={true}
                    paginationRowsPerPageOptions={[PER_PAGE_ITEM, 20, 30, 40]}
                    onChangePage={handlePageChange}
                  />
                  :
                  <Typography level="body-md" sx={{ mb: 1, mt: 0 }}>There are no records to display</Typography>
                }
              </div>
           </Box>
      </div>
  );
   
};
export default MainPage;