import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";

const CSVUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Veuillez sélectionner un fichier CSV.");
      return;
    }

    const formData = new FormData();
    formData.append("csvFile", file);

    try {
      const response = await fetch("http://localhost:3000/api/questions/upload-csv", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage("Erreur lors de l'importation du fichier CSV.");
      }
    } catch (error) {
      setMessage("Erreur lors de l'envoi du fichier CSV.");
    }
  };

  return (
    <Box m="20px">
      <Typography variant="h4" gutterBottom>
        Importer des questions depuis un fichier CSV
      </Typography>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <Button type="submit" variant="contained" color="primary" style={{ marginTop: "10px" }}>
          Importer
        </Button>
      </form>
      {message && <Typography style={{ marginTop: "10px" }}>{message}</Typography>}
    </Box>
  );
};

<<<<<<< HEAD
export default CSVUpload;
=======
export default CSVUpload;

>>>>>>> origin/main
