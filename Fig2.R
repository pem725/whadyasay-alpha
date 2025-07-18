library(gridExtra)
grid.arrange(p1, p2, p3, ncol = 1)

# label the x axis and eliminate the legend
p1 + theme(legend.position = "none") + labs(x = "Condition")
p2 + theme(legend.position = "none") + labs(x = "Condition")
p3 + theme(legend.position = "none") + labs(x = "Condition")

grid.arrange(p1 + theme(legend.position = "none") + labs(x = ""),
             p2 + theme(legend.position = "none") + labs(x = ""),
             p3 + theme(legend.position = "none") + labs(x = ""),
             nrow = 1)

