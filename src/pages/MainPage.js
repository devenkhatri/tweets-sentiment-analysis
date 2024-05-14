import { Box, Typography, styled, Button, FormControl } from '@mui/material';
import { useState, useEffect, useMemo } from "react";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DataTable from "react-data-table-component";
import Papa from "papaparse";
import { DetectSentimentCommand } from "@aws-sdk/client-comprehend";
import { comprehendClient} from "../libs/comprehend"
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
// import UseModal from '../libs/formDialog';
import { red, green, blue } from '@mui/material/colors';
import TextField from '@mui/material/TextField';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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
const PER_PAGE_ITEM = 1;
const MainPage = () => {
  const [newCSVFile, setCSVFile] = useState();
  const [activePage, setActivePage]= useState(0)
  const [tableData, setTableData] = useState([]);
  const [pending, setPending] = useState(false);
  const [isClick, setIsClick] = useState(false)
  const [identityPoolId, setIdentityPoolId] = useState("")
  // Memo that returns true if value is "error"
  const hasError = useMemo(() => !identityPoolId && isClick ? true : false, [identityPoolId, isClick]);

  // Memo that returns a helper message if value is "error" or a blank string if not
  const getHelperText = useMemo(
    () => (!identityPoolId && isClick ? "Pool Key cannot be blank" : ""),
    [identityPoolId, isClick]
  );
  const [generatedSentimental, setGeneratedSentimental] = useState({
    1: false
  });
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
              <span style={{ color : green[800]}}>{row?.sentimental?.Positive + "% "}</span>
              <span style={{ color : red[800]}}>{row?.sentimental?.Negative + "% "}</span>
              <span style={{ color : blue[800]}}>{row?.sentimental?.Neutral + "% "}</span>
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
            if (results.data.length) {
            const filterData = results?.data?.map((item) => {return({"feed" : item[0]})})
            console.log("Finished:", filterData);
            setTableData(filterData);
             setActivePage(1)
            }
          }}
        )
      }
    } catch (err) {
      console.log("Error", err);
    }
  };
  
  const getAnalyse = async () => {
    if (activePage) {
      setPending(true);
      const modifiedTableData = [...tableData]
      for (let i = (activePage-1)*PER_PAGE_ITEM; i < (activePage*PER_PAGE_ITEM); i++) {
        if (tableData?.[i]?.['feed'] && identityPoolId) {
          const input = { // DetectSentimentRequest
            Text: tableData[i]['feed'], // required
            LanguageCode: "en" || "es" || "fr" || "de" || "it" || "pt" || "ar" || "hi" || "ja" || "ko" || "zh" || "zh-TW", // required
          };
          const command = new DetectSentimentCommand(input);
          try {
            const data = await comprehendClient(identityPoolId).send(command);
            console.log("data >", data)
            if (data?.SentimentScore) {
              let finalString = {}
              if (data?.SentimentScore?.Negative) {
                finalString['Negative'] = (data?.SentimentScore?.Negative*100).toFixed(2);
                // finalString += `Ne- ${(data?.SentimentScore?.Negative*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Neutral) {
                finalString['Neutral'] = (data?.SentimentScore?.Neutral*100).toFixed(2)
                // finalString += `, Nu- ${(data?.SentimentScore?.Neutral*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Positive) {
                finalString['Positive'] = (data?.SentimentScore?.Positive*100).toFixed(2)
                // finalString += `Po- ${(data?.SentimentScore?.Positive*100).toFixed(2)} % `
              }
              modifiedTableData[i] = {...modifiedTableData[i], sentimental : finalString}
            }
          } catch (error) {
            
          }
        }
        console.log("modifiedTableData >", modifiedTableData)
      }
      const generatedSentimentalDummy = {...generatedSentimental}
      generatedSentimentalDummy[activePage] = true
      setGeneratedSentimental(generatedSentimentalDummy)
      setTableData(modifiedTableData)
      setPending(false);
    }
  }
  const handlePageChange = (e) => {
    console.log("data >>", e)
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
                  sx={{display: 'inline' }}
                >
                  Check Sentimental
                </LoadingButton>
              :
                <Button sx={{display: 'inline' }}  disabled={generatedSentimental?.[activePage] === true} variant="contained" color="secondary" onClick={() => {getAnalyse()}}>Check Sentimental</Button>
              }
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
                    paginationRowsPerPageOptions={[PER_PAGE_ITEM]}
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