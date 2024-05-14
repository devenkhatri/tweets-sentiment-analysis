import { Box, Typography, styled, Button } from '@mui/material';
import { useState } from "react";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DataTable from "react-data-table-component";
import Papa from "papaparse";
import { DetectSentimentCommand } from "@aws-sdk/client-comprehend";
import { comprehendClient} from "../libs/comprehend"

const IDENTITY_POOL_ID = "us-east-1:ec5a7813-91b7-479b-b22f-276763035c1b";

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
  const [generatedSentimental, setGeneratedSentimental] = useState({
    1: false
  });
  const columns = [
    {
      maxWidth: "220px",
      name: "Sentimental",
      selector: (row) => row?.sentimental || "-",
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
        if (tableData?.[i]?.['feed']) {
          const input = { // DetectSentimentRequest
            Text: tableData[i]['feed'], // required
            LanguageCode: "en" || "es" || "fr" || "de" || "it" || "pt" || "ar" || "hi" || "ja" || "ko" || "zh" || "zh-TW", // required
          };
          const command = new DetectSentimentCommand(input);
          try {
            const data = await comprehendClient(IDENTITY_POOL_ID).send(command);
            console.log("data >", data)
            if (data?.SentimentScore) {
              let finalString = ""
              if (data?.SentimentScore?.Negative) {
                finalString += `Ne- ${(data?.SentimentScore?.Negative*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Neutral) {
                finalString += `, Nu- ${(data?.SentimentScore?.Neutral*100).toFixed(2)} % `
              }
              if (data?.SentimentScore?.Positive) {
                finalString += `Po- ${(data?.SentimentScore?.Positive*100).toFixed(2)} % `
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
  
  return(
      <div className="main">
          <div className="main_title_div">
              <Typography level="h3" className="main_title">Twitter Feed Sentimental Application</Typography>
          </div>
          <Box component="section" sx={{ p: 2, border: '1px solid #f2f2f2'}}>
              <div className="upload_file_text">
                  <Typography level="body-md" sx={{ mb: 1, mt: 2 }}>Upload a CSV of Twitter Feeds that will be analyzed!</Typography>
                   <Button
                    component="label"
                    role={undefined}
                    variant="contained"
                    tabIndex={-1}
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload file
                    <VisuallyHiddenInput type="file" accept=".csv" onChange={({ target: { files } }) => {files[0] && setCSVFile(files[0]);}} />
                  </Button>
                  <Typography level="body-md" sx={{ mb: 1, mt: 0 }}>Selected CSV = {(newCSVFile && newCSVFile.name) || "No File Selected"}</Typography>
                  <Button variant="outlined" onClick={() => {getCsvDetails()}}>Analyse CSV</Button>
              </div>
           </Box>
           <Box component="section" sx={{ p: 2, border: '1px solid #f2f2f2', mt:2}}>
              <Typography level="body-md" sx={{ mb: 1, mt: 0 }}>Choose the following button to get information about the video to analyze.</Typography>
              <Button loading = {pending? true : false } loadingPosition="start" disabled={generatedSentimental?.[activePage] === true}  variant="outlined" onClick={() => {getAnalyse()}}>Analyse CSV</Button>
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
                    // paginationRowsPerPageOptions=[]
                    // selectableRows
                    // expandableRows
                    // expandableRowsComponent={ExpandedComponent}
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