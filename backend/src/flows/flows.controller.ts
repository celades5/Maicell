import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { Flow } from './entities/flow.entity';
import { FlowsService } from './flows.service';

@ApiTags('flows')
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  @ApiOperation({ summary: 'List all flows' })
  @ApiOkResponse({ type: Flow, isArray: true })
  findAll(): Promise<Flow[]> {
    return this.flowsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flow by id' })
  @ApiOkResponse({ type: Flow })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Flow> {
    return this.flowsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a flow' })
  @ApiCreatedResponse({ type: Flow })
  create(@Body() dto: CreateFlowDto): Promise<Flow> {
    return this.flowsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flow' })
  @ApiOkResponse({ type: Flow })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowDto,
  ): Promise<Flow> {
    return this.flowsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a flow' })
  @ApiNoContentResponse({ description: 'Flow deleted' })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.flowsService.remove(id);
  }
}
