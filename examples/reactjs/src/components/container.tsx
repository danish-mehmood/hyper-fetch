import ContainerComponent from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type ContainerProps = {
  name: string;
};

export const Container: React.FC<ContainerProps> = ({ children, name }) => {
  return (
    <Box sx={{ width: "100%", padding: "20px 0" }}>
      <ContainerComponent>
        <Typography variant="h3" sx={{ fontWeight: "800" }}>
          {name}
        </Typography>
        <Box>{children}</Box>
      </ContainerComponent>
    </Box>
  );
};
